## MODIFIED Requirements

### Requirement: Driver-Based Capability Composition
Runtime capabilities SHALL be composed through host-provided system drivers so filesystem, network, and child-process behavior are controlled by configured adapters rather than hardcoded runtime behavior. `NodeRuntime` construction SHALL require both a capability-side `SystemDriver` and an execution-side `RuntimeDriverFactory`.

#### Scenario: Node runtime uses configured adapters with explicit runtime driver factory
- **WHEN** `NodeRuntime` is created with a `SystemDriver` that defines filesystem, network, and command-execution adapters and with a `RuntimeDriverFactory`
- **THEN** sandboxed operations MUST route through those adapters for capability access and execution MUST be created through the provided runtime driver factory

#### Scenario: Missing permissions deny capability access by default
- **WHEN** a system driver is configured without explicit permission allowance for a capability domain
- **THEN** operations in that capability domain MUST be denied by default

#### Scenario: Omitted capability remains unavailable
- **WHEN** a capability adapter is omitted from system-driver configuration
- **THEN** corresponding sandbox operations MUST be unavailable or denied by the runtime contract

#### Scenario: Runtime process/os config remains system-driver-owned
- **WHEN** a caller provides runtime `process` and `os` configuration on the system driver
- **THEN** `NodeRuntime` MUST source and inject that configuration into runtime-driver creation
