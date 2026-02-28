## ADDED Requirements

### Requirement: Governance References Use Canonical Secure-Exec Naming
Governance artifacts that reference runtime package imports or runtime source paths SHALL use `secure-exec` and `packages/secure-exec` as the canonical identifiers.

#### Scenario: Governance guidance references runtime package imports
- **WHEN** a governance document or spec requirement describes runtime package imports
- **THEN** it MUST use `secure-exec` rather than `sandboxed-node`

#### Scenario: Governance guidance references runtime source paths
- **WHEN** a governance document or spec requirement describes runtime source directories
- **THEN** it MUST use `packages/secure-exec` rather than `packages/sandboxed-node`

## MODIFIED Requirements

### Requirement: Node Compatibility Target Version Tracks Test Type Baseline
The runtime compatibility target MUST align with the `@types/node` package major version used to validate secure-exec tests and type checks. Compatibility documentation and spec references MUST describe the same target major Node line.

#### Scenario: Current baseline is declared for contributors and users
- **WHEN** this requirement is applied for the current dependency baseline
- **THEN** compatibility docs and governance text MUST declare Node `22.x` as the active target line derived from `@types/node` `22.x`

#### Scenario: `@types/node` target major is upgraded
- **WHEN** the workspace intentionally upgrades `@types/node` to a new major version used by secure-exec validation
- **THEN** the same change MUST update `docs/node-compatability.mdx` and related compatibility-governance references to the new target Node major line

#### Scenario: Compatibility target is documented
- **WHEN** compatibility requirements or docs declare a target Node version
- **THEN** the declared target MUST match the active `@types/node` major version used by secure-exec validation workflows

### Requirement: Run Bridge Type Conformance Tests After Bridge Changes
Any change to files under `packages/secure-exec/src/bridge` MUST run bridge type conformance checks via `pnpm run check-types:test` in `packages/secure-exec` before completion.

#### Scenario: Bridge source file is modified
- **WHEN** a commit modifies one or more files in `packages/secure-exec/src/bridge`
- **THEN** `pnpm run check-types:test` MUST be executed and failures MUST be addressed before the change is considered complete

### Requirement: Compatibility Project Matrix Uses Black-Box Node Fixtures
Compatibility validation for secure-exec SHALL execute fixture projects that behave as ordinary Node projects, with no sandbox-aware code paths.

#### Scenario: Fixture uses only Node-project interfaces
- **WHEN** a fixture is added under the compatibility project matrix
- **THEN** it MUST define a standard Node project structure (`package.json` + source entrypoint) and MUST NOT import sandbox runtime internals directly

#### Scenario: Runtime remains opaque to fixture identity
- **WHEN** secure-exec executes a compatibility fixture
- **THEN** runtime behavior MUST NOT branch on fixture name, fixture path, or test-specific markers

### Requirement: Compatibility Matrix Enforces Differential Parity Checks
The compatibility project matrix SHALL execute each fixture in host Node and in secure-exec, then compare normalized externally visible outcomes.

#### Scenario: Pass fixture requires parity
- **WHEN** a fixture is classified as pass-expected
- **THEN** the matrix MUST fail unless host Node and secure-exec produce matching normalized `code`, `stdout`, and `stderr`

#### Scenario: Fail fixture requires deterministic failure contract
- **WHEN** a fixture is classified as fail-expected for unsupported behavior
- **THEN** the matrix MUST fail unless secure-exec produces the documented deterministic error contract

### Requirement: Compatibility Matrix Coverage Is Updated for Filesystem Semantics Changes
Changes to runtime or bridge filesystem metadata/rename behavior SHALL update compatibility project-matrix coverage with black-box fixtures that compare host Node and secure-exec normalized outputs.

#### Scenario: Metadata behavior change is implemented
- **WHEN** a change modifies `stat`, `exists`, typed `readdir`, or rename semantics in secure-exec
- **THEN** the compatibility project-matrix MUST include fixture coverage that exercises the changed behavior under host Node and secure-exec comparison
