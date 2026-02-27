## MODIFIED Requirements

### Requirement: Driver-Based Capability Composition
Runtime capabilities SHALL be composed through host-provided drivers so filesystem, network, and child-process behavior are controlled by configured adapters rather than hardcoded runtime behavior.

#### Scenario: Node process uses configured adapters
- **WHEN** `NodeProcess` is created with a driver that defines filesystem, network, and command-execution adapters
- **THEN** sandboxed operations MUST route through those adapters for capability access

#### Scenario: Omitted capability remains unavailable
- **WHEN** a capability adapter is omitted from runtime configuration
- **THEN** corresponding sandbox operations MUST be unavailable or denied by the runtime contract

#### Scenario: Node runtime rejects legacy top-level capability options
- **WHEN** a caller creates `NodeProcess` with legacy top-level capability fields (for example `filesystem`, `networkAdapter`, or `commandExecutor`) instead of using `driver`
- **THEN** construction MUST fail with a deterministic configuration error that directs the caller to provide capabilities through `driver`

## ADDED Requirements

### Requirement: Node Runtime Permission Source Is Driver-Owned
For Node runtime executions, permission policy MUST be sourced from `driver.permissions` and applied consistently to filesystem, network, child-process, and environment access paths.

#### Scenario: Driver permissions are applied to all capability wrappers
- **WHEN** `NodeProcess` is created with a driver that includes capability adapters and `driver.permissions`
- **THEN** runtime capability wrappers and environment filtering MUST enforce the provided `driver.permissions` policy for all relevant operations

#### Scenario: Node runtime rejects legacy top-level permissions override
- **WHEN** a caller provides top-level `permissions` when creating `NodeProcess`
- **THEN** construction MUST fail with a deterministic configuration error indicating Node runtime permissions are configured via `driver.permissions`
