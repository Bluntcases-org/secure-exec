## 1. Unified Runtime Surface

- [x] 1.1 Remove `BrowserSandbox` runtime surface and browser-specific runtime exports that bypass `NodeRuntime` driver composition
- [x] 1.2 Restore browser capability factory behavior in `createBrowserDriver` so it returns a functional `SystemDriver` with permission-wrapped adapters
- [x] 1.3 Wire browser runtime entrypoints so browser execution is constructed through `NodeRuntime` using browser `SystemDriver` + browser `RuntimeDriverFactory`

## 2. Browser Runtime Driver Implementation

- [x] 2.1 Implement browser runtime-driver factory and runtime-driver class that satisfy `RuntimeDriver` contract (run/exec/dispose/terminate + optional network facade)
- [x] 2.2 Move browser execution heavy lifting (worker lifecycle, message bridge, marshalling, teardown) into browser runtime-driver implementation
- [x] 2.3 Preserve deterministic unsupported-operation behavior (for example DNS/HTTP server gaps) through browser capability/runtime contracts

## 3. Browser Option Validation

- [x] 3.1 Add deterministic validation for browser-target runtime construction to reject `memoryLimit`, `cpuTimeLimitMs`, `timingMitigation`, and payload-limit overrides
- [x] 3.2 Add targeted tests that assert validation failures for each unsupported browser option and success for supported cross-target options

## 4. Shared Integration Harness

- [x] 4.1 Add `packages/secure-exec/tests/integration/` with reusable `run*` suite files that accept a class-based `TestContext`
- [x] 4.2 Implement `TestContext` class abstractions for `node` and `browser` targets, including target-specific setup/teardown and runtime construction helpers
- [x] 4.3 Add a single integration orchestrator that loops targets (`node`, `browser`) and invokes all shared `run*` suites under per-target `describe` blocks

## 5. Browser Test Runner and Documentation

- [x] 5.1 Add browser integration test runner wiring (config + script) that executes shared runtime-contract suites in a real browser engine
- [x] 5.2 Update docs and examples to show the unified `NodeRuntime` driver-based browser usage and remove `BrowserSandbox` guidance
- [x] 5.3 Update compatibility/friction tracking with browser-runtime restoration notes and run targeted checks (`pnpm` typecheck + targeted vitest node/browser suites)
