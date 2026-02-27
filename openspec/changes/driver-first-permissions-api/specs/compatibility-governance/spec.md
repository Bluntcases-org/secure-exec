## ADDED Requirements

### Requirement: Breaking Runtime Configuration API Changes MUST Synchronize Docs and Validation
Any breaking change to Node runtime configuration APIs (including driver wiring and permission-source semantics) MUST update user-facing docs and execute focused validation in the same change.

#### Scenario: Driver/permission API contract changes
- **WHEN** a change removes or materially alters Node runtime configuration paths (for example removing top-level `NodeProcess` adapter/permission options or changing `createNodeDriver` permission defaults)
- **THEN** the same change MUST update `README.md`, `docs/quickstart.mdx`, and the permission-model section of `docs/node-compatability.mdx` to match the new contract

#### Scenario: Runtime configuration contract is changed
- **WHEN** a change modifies Node runtime driver/permission configuration behavior
- **THEN** focused validation MUST be executed for affected runtime and permission surfaces (targeted `vitest` coverage and `tsc` type checks in affected package/workspace scope)

### Requirement: Breaking Runtime Configuration API Changes MUST Be Logged In Friction Tracking
Breaking runtime configuration API changes that impact migration or expected setup behavior MUST be recorded in the sandboxed-node friction log with clear fix/migration notes.

#### Scenario: Legacy configuration paths are removed
- **WHEN** a change removes previously supported Node runtime configuration paths
- **THEN** `docs-internal/friction/sandboxed-node.md` MUST record the change as resolved friction (or migration-impact note) including the new expected driver-first setup pattern
