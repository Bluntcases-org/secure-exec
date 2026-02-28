## Why

The runtime package and workspace folder still use the legacy `sandboxed-node` name while user-facing docs and examples already use `secure-exec`. This naming split causes avoidable integration errors, broken imports, and tooling drift whenever contributors or users follow current documentation.

## What Changes

- **BREAKING** Rename the runtime package from `sandboxed-node` to `secure-exec`.
- Move the runtime workspace directory from `packages/sandboxed-node/` to `packages/secure-exec/` while preserving behavior.
- Update repository-wide imports and path references that target the runtime package or its source directory.
- Update build/test/tooling references (workspace filters, package-local scripts, and bridge check paths) to the new package/directory identity.
- Refresh runtime/governance OpenSpec references that hardcode the old package path.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `node-runtime`: codify the canonical runtime package identity and source path under `secure-exec`.
- `compatibility-governance`: update governance requirements that reference runtime package paths and validation commands so they target `packages/secure-exec`.

## Impact

- Affected code:
  - `packages/sandboxed-node/**` -> `packages/secure-exec/**`
  - workspace and build configuration that references the old package path/name
  - internal imports across packages, tests, scripts, and docs that reference `sandboxed-node`
- Affected workflows:
  - package-scoped runtime checks (bridge type conformance, runtime typechecks/tests)
  - turbo/pnpm filters that currently target `sandboxed-node`
- API impact:
  - package import specifier changes from `sandboxed-node` to `secure-exec` (breaking)
