# Architecture Overview

```
NodeRuntime
  → SystemDriver + RuntimeDriverFactory
  → NodeExecutionDriver (node target) | BrowserRuntimeDriver + Worker runtime (browser target)
```

## NodeRuntime

`src/index.ts`

Public API. Thin facade that delegates orchestration to a runtime driver.

- `run(code)` — execute as module, get exports back
- `exec(code)` — execute as script, get exit code/error contract
- `dispose()` / `terminate()`
- Requires both:
  - `systemDriver` for runtime capabilities/config
  - `runtimeDriverFactory` for runtime-driver construction

## SystemDriver

`src/runtime-driver.ts` (re-exported from `src/types.ts`)

Config object that bundles what the sandbox can access. Deny-by-default.

- `filesystem` — VFS adapter
- `network` — fetch, DNS, HTTP
- `commandExecutor` — child processes
- `permissions` — per-adapter allow/deny checks

## RuntimeDriverFactory

Factory abstraction for constructing runtime drivers from normalized runtime options.

- `createRuntimeDriver(options)` — returns a `RuntimeDriver`

### createNodeDriver()

`src/node/driver.ts`

Factory that builds a `SystemDriver` with Node-native adapters.

- Wraps filesystem in `ModuleAccessFileSystem` (read-only `node_modules` overlay)
- Optionally wires up network and command executor

### createNodeRuntimeDriverFactory()

`src/node/driver.ts`

Factory that builds a Node-backed `RuntimeDriverFactory`.

- Constructs `NodeExecutionDriver` instances
- Owns optional Node-specific isolate creation hook

### createBrowserDriver()

`src/browser/driver.ts`

Factory that builds a browser `SystemDriver` with browser-native adapters.

- Uses OPFS or in-memory filesystem adapters
- Uses fetch-backed network adapter with deterministic `ENOSYS` for unsupported DNS/server paths
- Applies permission wrappers before returning the driver

### createBrowserRuntimeDriverFactory()

`src/browser/runtime-driver.ts`

Factory that builds a browser-backed `RuntimeDriverFactory`.

- Validates and rejects Node-only runtime options
- Constructs `BrowserRuntimeDriver` instances
- Owns worker URL/runtime-driver creation options

## NodeExecutionDriver

`src/node/execution-driver.ts`

The engine. Owns the `isolated-vm` isolate and bridges host capabilities in.

- Creates contexts, compiles ESM/CJS, runs code
- Bridges fs, network, child_process, crypto, timers into the isolate via `ivm.Reference`
- Caches compiled modules and resolved formats per isolate
- Enforces payload size limits on bridge transfers

## BrowserRuntimeDriver

`src/browser/runtime-driver.ts`

Browser execution driver that owns worker lifecycle and message marshalling.

- Spawns and manages the browser runtime worker
- Dispatches `run`/`exec` requests and correlates responses by request ID
- Streams optional stdio events to host hooks without runtime-managed output buffering
- Exposes the configured browser network adapter through `NodeRuntime.network`

## Browser Worker Runtime

`src/browser/worker.ts`

Worker-side runtime implementation used by the browser runtime driver.

- Initializes browser bridge globals and runtime config from worker init payload
- Executes transformed CJS/ESM user code and returns runtime-contract results
- Uses permission-aware filesystem/network adapters in the worker context
- Preserves deterministic unsupported-operation contracts (for example DNS gaps)

## ModuleAccessFileSystem

`src/node/module-access.ts`

Filesystem overlay that makes host `node_modules` available read-only at `/root/node_modules`.

- Blocks `.node` native addons
- Prevents symlink escapes (resolves pnpm virtual-store paths)
- Non-module paths fall through to base VFS

## Permissions

`src/shared/permissions.ts`

Wraps each adapter with allow/deny checks before calls reach the host.

- `wrapFileSystem()`, `wrapNetworkAdapter()`, `wrapCommandExecutor()`
- Missing adapters get deny-all stubs
