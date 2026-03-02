## Why

Browser runtime execution is currently disabled while the runtime-driver architecture has already converged on a universal `NodeRuntime` API. We need to restore browser support now by implementing a browser runtime driver and validating behavior parity with reusable integration tests.

## What Changes

- **BREAKING**: Remove `BrowserSandbox` as a public execution API and standardize on `NodeRuntime` with runtime-driver selection (`node` vs `browser`).
- Add a browser `RuntimeDriverFactory` implementation that performs the browser-specific execution heavy lifting (worker lifecycle, host bridge wiring, and browser capability shims) while reusing the same `NodeRuntime` orchestration contract.
- Restore browser capability driver construction (`createBrowserDriver`) and wire it to the same `SystemDriver` + `RuntimeDriverFactory` composition model as Node.
- Enforce deterministic option validation for browser runtime-driver creation: reject Node-only runtime options (`memoryLimit`, `cpuTimeLimitMs`, `timingMitigation`, and payload-limit overrides) when targeting browser execution.
- Add a shared integration harness built around a `TestContext` class and reusable `run*` suites that execute the same runtime-contract tests for both driver targets.
- Keep existing deny-by-default permissions behavior and runtime capability contracts consistent across both targets.

## Capabilities

### New Capabilities
- `runtime-driver-integration-testing`: Shared integration test harness that runs reusable runtime suites against multiple runtime-driver targets with one contract surface.

### Modified Capabilities
- `node-runtime`: Runtime execution support is expanded from Node-only phase behavior to include browser runtime-driver execution via `NodeRuntime`; browser-disabled requirements are removed and replaced with parity/validation requirements.
- `compatibility-governance`: Validation policy requires targeted integration coverage that runs shared runtime-contract suites across both node and browser runtime-driver targets.

## Impact

- Affected runtime API and implementation:
  - `packages/secure-exec/src/index.ts`
  - `packages/secure-exec/src/runtime-driver.ts`
  - `packages/secure-exec/src/browser/driver.ts`
  - `packages/secure-exec/src/browser/worker.ts`
  - `packages/secure-exec/src/browser/index.ts` (removal or deprecation path)
  - `packages/secure-exec/src/node/driver.ts`
- Affected tests:
  - New integration suite directory under `packages/secure-exec/tests/integration/`
  - Existing `packages/secure-exec/tests/test-utils.ts` and selected runtime tests migrated to shared `run*` suites
- Affected docs/specs:
  - `openspec/specs/node-runtime/spec.md`
  - `openspec/specs/compatibility-governance/spec.md`
  - compatibility/friction docs and runtime API docs referencing browser runtime availability
