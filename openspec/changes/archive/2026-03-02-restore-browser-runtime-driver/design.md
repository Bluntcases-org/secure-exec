## Context

The runtime architecture has converged on a universal `NodeRuntime` orchestrator that composes a capability-side `SystemDriver` with an execution-side `RuntimeDriverFactory`. During the boundary refactor, browser execution was intentionally disabled and `BrowserSandbox` was left as a throwing compatibility surface.

The next step is to restore browser execution without reintroducing split APIs or duplicated orchestration logic. The design target is one runtime API (`NodeRuntime`) with driver-only variation, plus reusable integration tests that assert runtime-contract behavior across `node` and `browser` execution targets.

## Goals / Non-Goals

**Goals:**
- Restore browser execution using the existing `NodeRuntime` + runtime-driver architecture.
- Remove `BrowserSandbox` and keep one universal runtime API.
- Keep capability ownership in `SystemDriver` and move browser execution heavy lifting into a browser runtime driver implementation.
- Enforce deterministic validation for Node-only options when browser runtime is selected.
- Introduce reusable integration suites (`run*` functions) that can be executed with a shared `TestContext` class for both node and browser targets.

**Non-Goals:**
- Backward compatibility for `BrowserSandbox` or legacy constructor aliases.
- Adding new capability domains beyond existing fs/network/child-process/env/runtime behavior.
- Full cross-browser matrix expansion in this change (single supported browser engine is sufficient initially).

## Decisions

### 1. Keep `NodeRuntime` as the only execution API

- **Choice:** Browser execution is restored by adding a browser `RuntimeDriverFactory`, not by reintroducing a separate browser runtime class.
- **Rationale:** This preserves the architecture goal that only the driver changes across targets.
- **Alternative considered:** Keep `BrowserSandbox` as a wrapper around `NodeRuntime`; rejected because it keeps parallel public runtime surfaces and API drift risk.

### 2. Move browser runtime heavy lifting into browser runtime driver

- **Choice:** Implement browser execution lifecycle in browser runtime-driver code (worker spin-up/teardown, message protocol, runtime marshalling, and browser bridge shims).
- **Rationale:** Mirrors Node driver ownership and keeps `NodeRuntime` focused on orchestration.
- **Alternative considered:** Put browser worker orchestration directly in `NodeRuntime`; rejected because it breaks driver boundary consistency.

### 3. Keep `createBrowserDriver` as capability-side `SystemDriver` factory

- **Choice:** `createBrowserDriver` returns a `SystemDriver` (OPFS/in-memory filesystem, browser fetch-backed network adapter, permission wrappers) and pairs with a separate browser runtime-driver factory.
- **Rationale:** Capability composition remains symmetric across node and browser targets.
- **Alternative considered:** Make browser runtime-driver implicitly create capability adapters; rejected because it conflates capability and execution layers.

### 4. Reject Node-only execution options for browser target

- **Choice:** Browser runtime-driver factory performs explicit validation and rejects `memoryLimit`, `cpuTimeLimitMs`, `timingMitigation`, and payload-limit overrides.
- **Rationale:** These options are Node/isolated-vm-specific and silently ignoring them would create unsafe ambiguity.
- **Alternative considered:** Ignore unsupported fields for browser; rejected because misconfiguration would pass silently.

### 5. Shared integration harness with class-based context

- **Choice:** Add `tests/integration/` suites exporting `runX(ctx: TestContext)` functions, and one orchestrator test that loops targets (`node`, `browser`) and executes all shared suites under `describe` blocks.
- **Rationale:** Reuses existing runtime-contract tests while preventing node/browser drift.
- **Alternative considered:** Duplicate separate node and browser spec files; rejected due to maintenance overhead and parity gaps.

### 6. Run browser integration through a browser test runner profile

- **Choice:** Add a dedicated browser integration runner configuration and script that executes the same suite in a real browser engine.
- **Rationale:** Browser runtime behavior (Worker/OPFS/fetch semantics) needs real-browser validation.
- **Alternative considered:** Node-only emulation for browser tests; rejected because it cannot validate critical browser runtime primitives.

## Risks / Trade-offs

- [Browser runtime contract mismatch with Node semantics] -> Mitigation: keep shared `run*` integration suites as parity gates and document intentional deviations in friction docs.
- [Browser tests are slower/flakier than node tests] -> Mitigation: keep browser suite targeted and under one minute, run full matrix only in dedicated CI lanes.
- [Removal of `BrowserSandbox` breaks existing consumers] -> Mitigation: treat as explicit breaking change with updated docs/examples in the same change.
- [Capability gaps in browser adapters (for example DNS/HTTP2)] -> Mitigation: keep deterministic `ENOSYS` contracts and spec coverage for unsupported operations.

## Migration Plan

1. Implement browser runtime driver factory and runtime-driver class that satisfy `RuntimeDriver` contract.
2. Re-enable `createBrowserDriver` capability factory and remove/retire `BrowserSandbox` exports.
3. Add browser target wiring in test utilities via a class-based `TestContext` abstraction.
4. Migrate selected existing runtime-contract tests into reusable `tests/integration/run*.ts` suites.
5. Add node and browser integration entrypoints that execute the same `run*` suites by target.
6. Update docs/specs/friction notes and run targeted typecheck/test commands for node and browser profiles.

## Open Questions

- Which single browser engine should be the default CI gate in phase one (Chromium recommended)?
- Should unsupported browser options fail at `NodeRuntime` construction time or runtime-driver factory creation time (factory-time preferred for clearer ownership)?
