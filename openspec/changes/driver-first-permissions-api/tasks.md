## 1. Enforce Driver-Only Node Runtime Configuration

- [ ] 1.1 Remove top-level Node capability/permission fields from `NodeProcessOptions` and require capability wiring through `driver`.
- [ ] 1.2 Add deterministic constructor validation that rejects legacy top-level capability fields (`filesystem`, `networkAdapter`, `commandExecutor`) and top-level `permissions`.
- [ ] 1.3 Update Node runtime wiring so filesystem/network/command wrappers and env filtering read policy only from `driver.permissions`.

## 2. Remove Implicit Permissive Driver Defaults

- [ ] 2.1 Update `createNodeDriver(...)` to stop auto-applying `allowAll` when adapters are present and `permissions` is omitted.
- [ ] 2.2 Keep explicit permission helper behavior (`allowAll`, `allowAllFs`, `allowAllNetwork`, `allowAllChildProcess`, `allowAllEnv`) unchanged as caller opt-in.
- [ ] 2.3 Update exported type/docs comments to reflect single-source permission policy via `driver.permissions`.

## 3. Update and Expand Runtime/Permission Tests

- [ ] 3.1 Update Node runtime tests to use driver-only construction patterns and remove legacy top-level option usage.
- [ ] 3.2 Add regression tests for deterministic constructor failure on legacy top-level NodeProcess fields.
- [ ] 3.3 Add regression tests proving adapters without explicit permissions do not behave as implicit `allowAll`.
- [ ] 3.4 Run focused validation for affected surfaces (`pnpm vitest run` targeted suites and `pnpm tsc --noEmit` in affected workspace scope).

## 4. Synchronize Docs and Friction Tracking

- [ ] 4.1 Update `README.md` and `docs/quickstart.mdx` examples to the driver-first API and explicit permission policy.
- [ ] 4.2 Update the permission-model section in `docs/node-compatability.mdx` to remove references to legacy top-level NodeProcess permissions path.
- [ ] 4.3 Record the breaking driver/permission contract shift in `docs-internal/friction/sandboxed-node.md` with migration notes.
