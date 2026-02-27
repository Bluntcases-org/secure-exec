## Why

The current Node API mixes multiple configuration paths (`driver`, direct adapters, and top-level `permissions`) with inconsistent defaults, which makes security posture harder to reason about and easy to misconfigure. We need one explicit model now: capabilities come from the driver, and permission policy is explicitly attached to that driver.

## What Changes

- **BREAKING**: Make `NodeProcess` driver-only for capability configuration; remove top-level Node adapter/permission configuration fields (`filesystem`, `networkAdapter`, `commandExecutor`, `permissions`) from `NodeProcessOptions`.
- **BREAKING**: Remove implicit permissive default in `createNodeDriver(...)`; providing capability adapters without an explicit `permissions` policy will no longer auto-apply `allowAll`.
- Require a single permission source for Node runtime capability enforcement: `driver.permissions`.
- Keep deny-by-default behavior as the canonical enforcement contract when a permission checker is missing.
- Keep `allowAll`, `allowAllFs`, `allowAllNetwork`, `allowAllChildProcess`, and `allowAllEnv` as explicit opt-in helpers for embedders.
- Update docs and governance artifacts so public examples, compatibility/security guidance, and friction tracking reflect the new driver-first contract.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `node-runtime`: change Node runtime construction contract to driver-only capability wiring and remove parallel top-level capability/permission paths.
- `node-permissions`: require driver-owned permission policy as the single Node runtime permission source and remove implicit permissive driver defaults.
- `compatibility-governance`: require documentation/friction/test workflow updates for breaking runtime API contract changes affecting driver/permission semantics.

## Impact

- Affected code:
  - `packages/sandboxed-node/src/index.ts`
  - `packages/sandboxed-node/src/node/driver.ts`
  - `packages/sandboxed-node/src/types.ts`
  - `packages/sandboxed-node/src/shared/permissions.ts`
- Affected tests:
  - `packages/sandboxed-node/tests/index.test.ts`
  - `packages/sandboxed-node/tests/permissions.test.ts`
  - `packages/sandboxed-node/tests/project-matrix.test.ts`
- Affected docs:
  - `README.md`
  - `docs/quickstart.mdx`
  - `docs/node-compatability.mdx`
  - `docs-internal/friction/sandboxed-node.md`
