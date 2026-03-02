## 1. Driver Contract and Public API

- [x] 1.1 Add a generic runtime-driver interface in `packages/secure-exec/src/types.ts` for execution lifecycle, capability handles, and runtime config access
- [x] 1.2 Update `NodeProcessOptions` in `packages/secure-exec/src/index.ts` to require `driver` and remove direct constructor capability options (`filesystem`, `networkAdapter`, `commandExecutor`, `permissions`)
- [x] 1.3 Remove optional constructor fallback driver creation in `NodeProcess` and simplify permission precedence to driver-owned policy only

## 2. Move Node Runtime Heavy Lifting into Driver

- [x] 2.1 Refactor `packages/secure-exec/src/node/driver.ts` to own Node/`isolated-vm` execution-heavy logic (isolate lifecycle, module execution, dynamic import internals, host marshalling)
- [x] 2.2 Keep bridge/loader orchestration in `NodeProcess` over the new generic driver interface, with `processConfig` and `osConfig` injected by `NodeProcess` from driver-provided values
- [x] 2.3 Remove obsolete runtime-specific methods/fields from `NodeProcess` that become driver-owned

## 3. Enforce Deny-by-Default Driver Policy

- [x] 3.1 Update Node driver defaults so missing permission checks reject all capability access
- [x] 3.2 Remove permissive fallback behavior in driver construction paths and align all driver-created adapters with explicit allow semantics
- [x] 3.3 Add/adjust tests for deny-by-default behavior under required-driver construction

## 4. Temporarily Disable Browser Surface

- [x] 4.1 Comment out browser-facing exports and integration paths in `packages/secure-exec/src/index.ts` and package entrypoints for this phase
- [x] 4.2 Comment out browser runtime implementation paths under `packages/secure-exec/src/browser/` as needed to keep Node runtime refactor isolated
- [x] 4.3 Add clear temporary unsupported notes in code/docs to track browser restoration as follow-up work

## 5. Migrate Tests, Docs, and Validation

- [x] 5.1 Update `packages/secure-exec/tests/index.test.ts` and related call sites to always construct `NodeProcess` with a driver
- [x] 5.2 Update README/examples/OpenSpec references that mention old constructor fallback or direct capability options
- [x] 5.3 Log migration friction and fix notes in `docs-internal/friction.md`, including temporary browser disable and restore follow-up
- [x] 5.4 Run targeted checks in `packages/secure-exec`: `pnpm run check-types`, targeted `vitest` coverage for NodeProcess/driver behavior, and any required spec-conformance checks (commands executed; blocked by missing local deps/artifacts: `esbuild`, `isolated-vm`, generated isolate-runtime module)
