## Why

The current integration test organization mixes target orchestration details with suite definitions, which increases cognitive load and makes it harder to verify that all compatible driver pairs are covered uniformly. We need a simpler, explicit structure that keeps one matrix entrypoint and clear boundaries for shared vs driver-specific coverage.

## What Changes

- Replace the current integration harness layout with a single matrix entrypoint at `packages/secure-exec/tests/test-suite.test.ts`.
- Move reusable matrix-applied suites to flat files under `packages/secure-exec/tests/test-suite/{name}.ts`.
- Split non-shareable assertions into dedicated `packages/secure-exec/tests/exec-driver/{name}.test.ts` and `packages/secure-exec/tests/runtime-driver/{name}.test.ts` files.
- Enforce that all compatible `(exec driver, runtime driver)` pairs execute the same shared suites with no pair-specific suite exclusions.
- Update test scripts/config wiring to run the new matrix suite and driver-specific suites deterministically.

## Capabilities

### New Capabilities
- `runtime-driver-test-suite-structure`: Defines required secure-exec test-suite layout and matrix execution rules for shared driver-pair coverage.

### Modified Capabilities
- `compatibility-governance`: Runtime-driver contract changes must validate through the canonical matrix entrypoint and keep driver-specific tests separated from shared suites.

## Impact

- Affected tests and wiring:
  - `packages/secure-exec/tests/**`
  - `packages/secure-exec/vitest*.ts`
  - `packages/secure-exec/package.json`
- Affected governance/docs:
  - `openspec/specs/compatibility-governance/spec.md`
  - `docs-internal/arch/overview.md` (if component/test-map references need alignment)
  - `docs-internal/friction.md` (if restructuring reveals migration friction)
