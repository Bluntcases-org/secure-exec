# node-runtime Specification

## Purpose
Define runtime execution contracts, module loading behavior, async completion semantics, and dynamic import behavior.

## Requirements
### Requirement: Unified Sandbox Execution Interface
The project SHALL provide a stable sandbox execution interface for both Node and browser runtimes, with each runtime exposing an `exec` path for running untrusted code and returning structured execution results. Dynamic `import()` expressions within executed code SHALL evaluate lazily at call time rather than eagerly during setup.

#### Scenario: Execute code in Node runtime
- **WHEN** a caller creates `NodeProcess` with a valid driver and invokes `exec`
- **THEN** the sandbox MUST run the provided code in an isolated execution context and return structured output for the caller

#### Scenario: Execute code in browser runtime
- **WHEN** a caller creates `BrowserSandbox` and invokes `exec`
- **THEN** the sandbox MUST execute code in a Worker-backed isolated context and return structured output for the caller

#### Scenario: Dynamic imports in executed code evaluate lazily
- **WHEN** a caller invokes `exec` with code containing `import()` expressions
- **THEN** the execution pipeline MUST defer module evaluation until the `import()` expression is reached during code execution, preserving correct side-effect ordering

### Requirement: Driver-Based Capability Composition
Runtime capabilities SHALL be composed through host-provided drivers so filesystem, network, and child-process behavior are controlled by configured adapters rather than hardcoded runtime behavior.

#### Scenario: Node process uses configured adapters
- **WHEN** `NodeProcess` is created with a driver that defines filesystem, network, and command-execution adapters
- **THEN** sandboxed operations MUST route through those adapters for capability access

#### Scenario: Omitted capability remains unavailable
- **WHEN** a capability adapter is omitted from runtime configuration
- **THEN** corresponding sandbox operations MUST be unavailable or denied by the runtime contract

### Requirement: Active Handle Completion for Async Operations
The Node runtime SHALL wait for tracked active handles before finalizing execution results so callback-driven asynchronous work can complete.

#### Scenario: Child process output completes before exec resolves
- **WHEN** sandboxed code starts a child process and registers active-handle lifecycle events
- **THEN** `exec` MUST wait for handle completion before returning final output

### Requirement: Host-to-Sandbox HTTP Verification Path
The Node runtime SHALL expose a host-side request path for sandboxed HTTP servers so loader/host code can verify server behavior externally.

#### Scenario: Host fetches sandbox server endpoint
- **WHEN** sandboxed code starts an HTTP server through the bridged server APIs
- **THEN** host code MUST be able to issue requests through the runtime network facade and receive the sandbox server response

### Requirement: Lazy Evaluation of Dynamic Imports
Dynamically imported modules (`import()`) SHALL be evaluated only when the import expression is reached during user code execution, not during the precompilation phase.

#### Scenario: Side effects execute at import call time
- **WHEN** user code contains `console.log("before"); const m = await import("./side-effect"); console.log("after")` where `./side-effect` logs "side-effect" on evaluation
- **THEN** stdout MUST contain "before", "side-effect", "after" in that order

#### Scenario: Conditional dynamic import skips unused branch
- **WHEN** user code contains `if (false) { await import("./unused"); }` where `./unused` logs "loaded" on evaluation
- **THEN** stdout MUST NOT contain "loaded"

#### Scenario: Repeated dynamic import returns same module without re-evaluation
- **WHEN** user code calls `await import("./mod")` twice, where `./mod` increments a global counter on evaluation
- **THEN** the counter MUST equal 1 after both imports, and both calls MUST return the same module namespace

### Requirement: Precompilation Without Evaluation
The precompilation phase SHALL resolve and compile dynamic import targets but MUST NOT instantiate or evaluate them.

#### Scenario: Precompiled module has no side effects before user code
- **WHEN** a module targeted by a static `import("./target")` specifier logs to console on evaluation
- **THEN** no console output from that module SHALL appear before user code begins executing

### Requirement: Async Dynamic Import Resolution
The `__dynamicImport` bridge function SHALL return a Promise that resolves to the module namespace, performing instantiation and evaluation on demand.

#### Scenario: Dynamic import resolves to module namespace
- **WHEN** user code calls `const m = await import("./mod")` where `./mod` exports `{ value: 42 }` as default
- **THEN** `m.default` MUST equal `{ value: 42 }`

#### Scenario: Dynamic import of non-existent module rejects
- **WHEN** user code calls `await import("./nonexistent")`
- **THEN** the returned Promise MUST reject with an error indicating the module cannot be resolved
