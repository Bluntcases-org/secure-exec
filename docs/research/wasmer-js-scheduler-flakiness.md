# Wasmer-JS Scheduler Flakiness

## Summary

Tests using wasmer-js were highly flaky - sometimes passing, sometimes timing out. The pattern was:
- First run often timed out
- 2-3 subsequent runs would pass quickly
- Then timeouts would resume

## Symptoms

```
Run 1: FAIL (timeout 10s)
Run 2: PASS (271ms)
Run 3: PASS (609ms)
Run 4: FAIL (timeout 10s)
Run 5: FAIL (timeout 10s)
```

Logs showed:
```
WARN wasmer_js::tasks::worker_handle: Scheduler is closed, dropping message
```

## Root Cause

### Primary Cause: Thread pool closed prematurely (Race Condition)

Location: `src/wasmer.rs:237-258`

`Command::run()` created a **new ThreadPool for each command**, then called `thread_pool.close()` after the WASI command finished:

```rust
// Before (buggy)
pub async fn run(&self, options: Option<SpawnOptions>) -> Result<Instance, Error> {
    let thread_pool = Arc::new(ThreadPool::new());  // New pool per command!
    let runtime = Arc::new(self.runtime.with_task_manager(thread_pool.clone()));
    // ...
    tasks.task_dedicated(Box::new(move || {
        let result = runner.run_command(&command_name, &pkg, ...);
        let _ = sender.send(ExitCondition::from_result(result));
        thread_pool.close();  // Closes scheduler while streams still reading!
    }))?;
    // ...
}
```

#### Why Closing Breaks It

To understand this, you need to know the wasmer-js architecture:

```
┌─────────────────────────────────────────────────────────────────┐
│ Main Thread                                                     │
│                                                                 │
│  ┌─────────────┐     ┌───────────────┐     ┌─────────────────┐ │
│  │ ThreadPool  │────▶│   Scheduler   │────▶│  WorkerHandles  │ │
│  └─────────────┘     │  (async loop) │     │  (idle + busy)  │ │
│                      └───────────────┘     └────────┬────────┘ │
│                                                     │          │
│  ┌─────────────────────────────────────────────────┐│          │
│  │ Instance::wait()                                ││          │
│  │   - reading stdout stream (waiting for EOF)    ││          │
│  │   - reading stderr stream (waiting for EOF)    ││          │
│  │   - waiting for exit code                       ││          │
│  └─────────────────────────────────────────────────┘│          │
└─────────────────────────────────────────────────────│──────────┘
                                                      │
                    ┌─────────────────────────────────┘
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│ Web Workers (separate threads)                                  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Worker 1: Running WASM                                   │   │
│  │   - executing echo "hello"                               │   │
│  │   - writes "hello\n" to stdout pipe                      │   │
│  │   - when done, closes stdout pipe → sends EOF            │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

When `thread_pool.close()` is called:

1. `SchedulerMessage::Close` is sent to the scheduler's channel
2. Scheduler receives `Close`, breaks out of its message loop
3. `SchedulerState` is dropped, which drops all `WorkerHandle`s
4. Each `WorkerHandle::drop()` calls `worker.terminate()`
5. **Web Workers are immediately killed**

The problem: The main thread's stream reader is waiting for EOF on the stdout pipe. EOF is only sent when the WASM process closes its stdout file descriptor (which happens when WASM exits cleanly). But if the worker is terminated before WASM exits, the pipe is never closed - it's just orphaned.

```
Main Thread                          Worker Thread
     │                                    │
     │  ◀─── stdout pipe ───────────────  │ (WASM writing)
     │       (waiting for EOF)            │
     │                                    │
     │                               close() called
     │                                    │
     │                               worker.terminate()
     │                                    ╳ (killed)
     │
     │  still waiting for EOF...
     │  (will wait forever)
```

The stdout pipe is a shared memory buffer. The worker was supposed to close it (triggering EOF), but the worker was killed first. The main thread has no way to know the worker is gone - it just sees an open pipe with no more data coming.

#### The Race

```
close() called  ←────────── RACE ──────────→  stdout pipe closed by WASM
      ↓                                              ↓
workers terminated                            EOF sent to reader
      ↓                                              ↓
   pipe orphaned                                 works fine
      ↓
   stream reader hangs
```

This is inherently timing-dependent, which explains the flaky behavior. The outcome depends on whether the WASM process finishes writing and closes its pipes before `close()` terminates the workers.

### Secondary Issue: No timeout on stream reading

Location: `src/instance.rs:wait()`

The original code used `try_join!` to wait for stdout, stderr, and exit simultaneously with no timeout:

```rust
// Before (buggy)
let (_, _, ExitCondition(code)) =
    futures::try_join!(stdout_done, stderr_done, exit.map_err(Error::from))?;
```

The comment in the code even acknowledged this risk:

```rust
// Note: this relies on the underlying instance closing stdout and
// stderr when it exits. Failing to do this will block forever.
```

This is not the root cause of the flakiness, but it's why the race condition manifests as an **infinite hang** rather than an error. Without the primary bug (premature close), streams would close properly and this code would work fine. The timeout fix is a **defensive measure** for edge cases.

## The Fix

### Final Fix: Per-command ThreadPool with Arc+Drop lifecycle

The cleanest solution is to use per-command pools but manage their lifecycle correctly using Rust's ownership system:

```rust
// Instance struct now holds the pool
pub struct Instance {
    pub stdin: Option<web_sys::WritableStream>,
    pub stdout: web_sys::ReadableStream,
    pub stderr: web_sys::ReadableStream,
    pub(crate) exit: Receiver<ExitCondition>,
    pub(crate) fs: TmpFileSystem,
    // Pool is kept alive until Instance is dropped
    pub(crate) _thread_pool: Option<Arc<ThreadPool>>,
}

// Command::run() creates per-command pool, stores in Instance
pub async fn run(&self, options: Option<SpawnOptions>) -> Result<Instance, Error> {
    let thread_pool = Arc::new(ThreadPool::new());
    let runtime = Arc::new(self.runtime.with_task_manager(thread_pool.clone()));
    // ...
    tasks.task_dedicated(Box::new(move || {
        let result = runner.run_command(&command_name, &pkg, ...);
        let _ = sender.send(ExitCondition::from_result(result));
        // Don't close here - pool will be closed when Instance is dropped
    }))?;

    Ok(Instance {
        stdin,
        stdout,
        stderr,
        exit: receiver,
        fs,
        _thread_pool: Some(thread_pool),  // Store pool in Instance
    })
}

// ThreadPool::drop() closes the scheduler
impl Drop for ThreadPool {
    fn drop(&mut self) {
        self.scheduler.close();  // Now safe - streams are done
    }
}
```

**Why this works:**

1. `Command::run()` creates `Arc<ThreadPool>` with refcount = 1
2. Instance stores it (refcount stays at 1 after runtime's Arc moves into task)
3. WASM command runs, finishes, task callback returns
4. User calls `instance.wait()`, which reads streams until EOF
5. `wait()` returns, Instance is dropped
6. `_thread_pool` Arc drops (refcount = 0)
7. `ThreadPool::drop()` runs → `scheduler.close()`
8. Workers terminated cleanly **after** streams are done

The key insight is that the pool should live as long as the Instance, not just as long as the WASM command execution.

### Alternative: Global thread pool (simpler but less clean)

Instead of creating a new thread pool per command, use the global `DEFAULT_THREAD_POOL`:

```rust
pub async fn run(&self, options: Option<SpawnOptions>) -> Result<Instance, Error> {
    // Use the global default pool - don't create a new one per command
    let runtime = Arc::new(self.runtime.with_default_pool());
    // ...
    tasks.task_dedicated(Box::new(move || {
        let result = runner.run_command(&command_name, &pkg, ...);
        let _ = sender.send(ExitCondition::from_result(result));
        // Don't close - pool is shared globally
    }))?;
    // ...
}
```

This works but leaves workers running indefinitely. The Arc+Drop approach provides proper cleanup.

### Not used: Timeout on stream reading

An earlier iteration added timeout logic to handle streams not closing. This is NOT needed with the Arc+Drop fix because streams will always close properly. The original simple `try_join!` logic is preserved:

```rust
// Original code - still works with Arc+Drop fix
let (_, _, ExitCondition(code)) =
    futures::try_join!(stdout_done, stderr_done, exit.map_err(Error::from))?;
```

## Commits

**wasmer-js** (`rivet-patches` branch):
```
d822560 Fix scheduler flakiness with per-command ThreadPool Arc+Drop lifecycle
```

Files changed:
- `src/wasmer.rs` - Create per-command pool, store in Instance, remove `close()` call
- `src/run.rs` - Same changes for `run_wasix()` function
- `src/instance.rs` - Add `_thread_pool` field to hold pool reference
- `src/tasks/thread_pool.rs` - Enable `scheduler.close()` in `Drop` impl

The original `try_join!` logic is preserved - no timeout/select changes needed.

## Test Results After Fix

**vm.test.ts**: 6/6 passed
- echo command
- ls command
- bash echo builtin
- file write/read via bash
- file existence check
- filesystem isolation

**node-process.test.ts**: 3/4 passed
- node -e execution
- node error handling
- stdin handling
- ~~child spawning via spawnSync~~ (separate WASM IPC bug, not scheduler-related)

## Debugging Approach

1. Added console logging to scheduler loop to trace message flow
2. Discovered scheduler was receiving `Close` message during each run
3. Traced `Close` back to `thread_pool.close()` call in `Command::run()`
4. Added logging to `Instance::wait()` to find stdout was hanging
5. Identified that exit completed but stdout never received EOF
6. Implemented timeout-based solution with incremental buffering
