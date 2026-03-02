## MODIFIED Requirements

### Requirement: Unified Sandbox Execution Interface
The project SHALL provide a stable sandbox execution interface through `NodeRuntime`, with `exec` for running untrusted code and returning structured execution results and `run` for module-export evaluation. Runtime-driver target selection (node or browser) MUST not require separate runtime classes.

#### Scenario: Execute code in Node runtime target
- **WHEN** a caller creates `NodeRuntime` with a Node-target runtime driver and invokes `exec`
- **THEN** the sandbox MUST run the provided code in an isolated execution context and return structured output for the caller

#### Scenario: Execute code in browser runtime target
- **WHEN** a caller creates `NodeRuntime` with a browser-target runtime driver and invokes `exec`
- **THEN** execution MUST run through browser runtime primitives and return the same structured runtime result contract

#### Scenario: Run CJS module and retrieve exports
- **WHEN** a caller invokes `run()` with CommonJS code that assigns to `module.exports`
- **THEN** the result's `exports` field MUST contain the value of `module.exports`

#### Scenario: Run ESM module and retrieve namespace exports
- **WHEN** a caller invokes `run()` with ESM code that uses `export` declarations
- **THEN** the result's `exports` field MUST contain the module namespace object with all named exports and the `default` export (if declared)

#### Scenario: Run ESM module with only a default export
- **WHEN** a caller invokes `run()` with ESM code containing `export default <value>`
- **THEN** the result's `exports` field MUST be an object with a `default` property holding that value

#### Scenario: Run ESM module with named and default exports
- **WHEN** a caller invokes `run()` with ESM code containing both `export default` and named `export` declarations
- **THEN** the result's `exports` field MUST be an object containing both the `default` property and all named export properties

## ADDED Requirements

### Requirement: Browser Runtime Driver Rejects Node-Only Execution Options
Browser-target runtime-driver construction MUST reject Node-specific runtime options that are unsupported in browser execution.

#### Scenario: Browser runtime rejects Node-only execution controls
- **WHEN** a caller creates `NodeRuntime` with a browser runtime-driver factory and passes any of `memoryLimit`, `cpuTimeLimitMs`, `timingMitigation`, or payload-limit overrides
- **THEN** construction MUST fail with a deterministic validation error indicating unsupported browser runtime options

#### Scenario: Browser runtime accepts baseline cross-target options
- **WHEN** a caller creates `NodeRuntime` with a browser runtime-driver factory using only cross-target options (for example `systemDriver`, `runtimeDriverFactory`, and optional `onStdio`)
- **THEN** runtime construction MUST succeed and preserve runtime execution behavior

### Requirement: BrowserSandbox API Surface Is Removed
The runtime contract MUST expose browser execution through `NodeRuntime` driver composition and MUST NOT require a separate `BrowserSandbox` execution class.

#### Scenario: Runtime entrypoint is unified by driver target
- **WHEN** a caller needs browser execution behavior
- **THEN** they MUST construct `NodeRuntime` with browser system/runtime drivers rather than a separate browser sandbox runtime class
