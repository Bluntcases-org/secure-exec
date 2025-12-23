# Scheduler-Routed Pipes Implementation Status

**Date:** 2024-12-21
**Branch:** `scheduler-routed-pipes` in wasmer-js repo

## Implementation Complete

The scheduler-routed pipes infrastructure is fully implemented in wasmer-js:

- `src/pipes/mod.rs` - SimplePipe, SimplePipeTx, SimplePipeRx types
- `src/tasks/scheduler_message.rs` - PipeCreate, PipeWrite, PipeRead, PipeClose messages
- `src/tasks/scheduler.rs` - PIPE_BUFFERS management and handlers
- `src/runtime.rs` - create_pipe() returns SimplePipe

## Test Results (Isolated Runs)

| Category | Test | Result | Notes |
|----------|------|--------|-------|
| **Basic Subprocess** | `echo hello` | ✅ PASS | stdout="hello\n" |
| | `/bin/echo hello` | ✅ PASS | stdout="hello\n" |
| | `ls /` | ✅ PASS | stdout="bin\ndev\netc\ntmp\nusr\n" |
| | `echo a; echo b` | ✅ PASS | stdout="a\nb\n" |
| **Simple Pipes** | `echo test \| cat` | ✅ PASS | stdout="test\n" |
| **Multi-stage Pipes** | `echo abc \| cat \| cat` | ✅ PASS | stdout="abc\n" |
| | `ls / \| head -3` | ✅ PASS | stdout="bin\ndev\netc\n" |
| **Command Substitution** | `echo $(echo inner)` | ❌ FAIL | stdout="" (empty) |
| | `x=$(echo val); echo $x` | ❌ FAIL | stdout="" (empty) |

## Remaining Issues

### Issue 1: Sequential Execution Hang

**Symptom:** Running multiple WASM commands in the same Node.js process causes subsequent commands to hang after 3-4 runs.

**Cause:** Scheduler state (PIPE_BUFFERS, worker state) not properly cleaned up between command executions.

**Impact:** Tests must run in isolated processes; can't run test suites efficiently.

### Issue 2: Command Substitution Returns Empty

**Symptom:** `echo $(echo inner)` returns empty stdout instead of "inner\n".

**Cause:** The subprocess runs but its stdout is not being captured back to the parent shell for variable substitution. This is likely a pipe routing issue specific to how bash handles command substitution internally.

**Technical Details:** Command substitution in bash:
1. Creates a pipe
2. Forks a subshell connected to the pipe
3. Runs the command in the subshell
4. Reads the pipe output back into a variable
5. Substitutes the variable into the parent command

The issue is likely in step 4 - the pipe read is not receiving the subshell's output.

### Issue 3: Exit Code 45

**Symptom:** All bash commands return exit code 45.

**Cause:** Known WASIX bash issue, not related to pipes. Documented in `docs/bugs/wasix-bash-builtin-exit-codes.md`.

## Next Steps

1. Fix sequential execution hang by ensuring proper cleanup
2. Investigate command substitution pipe routing
3. Add comprehensive test coverage once sequential execution works
