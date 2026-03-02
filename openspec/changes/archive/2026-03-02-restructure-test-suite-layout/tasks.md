## 1. Shared Matrix Suite Layout

- [x] 1.1 Create `packages/secure-exec/tests/test-suite.test.ts` as the single compatibility-matrix orchestrator for compatible `(execution driver, runtime driver)` pairs
- [x] 1.2 Move shared runtime suites into flat files under `packages/secure-exec/tests/test-suite/{name}.ts` (including current runtime-contract and browser-option contract assertions)
- [x] 1.3 Remove superseded shared-suite orchestrators/context wrappers that duplicate node/browser entrypoints

## 2. Driver-Specific Suite Split

- [x] 2.1 Add `packages/secure-exec/tests/exec-driver/{name}.test.ts` coverage for assertions that cannot be shared across all compatible matrix pairs
- [x] 2.2 Add `packages/secure-exec/tests/runtime-driver/{name}.test.ts` coverage for assertions that cannot be shared across all compatible matrix pairs
- [x] 2.3 Preserve exploit-oriented regression coverage during moves, including high-volume log behavior tests that guard against host memory/CPU amplification

## 3. Test Runner Wiring And Verification

- [x] 3.1 Update `packages/secure-exec/package.json` and Vitest include wiring to run `tests/test-suite.test.ts`, `tests/exec-driver/*.test.ts`, and `tests/runtime-driver/*.test.ts`
- [x] 3.2 Run targeted validation commands and fix failures: `pnpm --filter secure-exec test -- tests/test-suite.test.ts`, `pnpm --filter secure-exec test -- tests/exec-driver/*.test.ts`, `pnpm --filter secure-exec test -- tests/runtime-driver/*.test.ts`
- [x] 3.3 Run `pnpm --filter secure-exec check-types` and ensure no type regressions from moved suites

## 4. Governance And Documentation Alignment

- [x] 4.1 Update OpenSpec deltas to document canonical suite paths and matrix rules for shared vs driver-specific coverage
- [x] 4.2 Update `docs-internal/friction.md` if migration reveals structural friction or temporary workarounds
