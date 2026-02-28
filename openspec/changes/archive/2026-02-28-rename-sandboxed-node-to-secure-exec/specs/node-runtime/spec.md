## ADDED Requirements

### Requirement: Runtime Package Identity Uses Secure-Exec
The runtime SHALL publish its execution interface from the `secure-exec` package name, and runtime implementation sources SHALL reside under `packages/secure-exec` in the workspace.

#### Scenario: Consumers import runtime APIs from secure-exec
- **WHEN** a Node or browser consumer imports runtime APIs
- **THEN** the documented and supported package specifier MUST be `secure-exec`

#### Scenario: Runtime source path is canonicalized to secure-exec
- **WHEN** contributors update runtime implementation files
- **THEN** those files MUST live under `packages/secure-exec` rather than `packages/sandboxed-node`

## MODIFIED Requirements

### Requirement: Host-Side Parse Boundaries Protect Runtime Stability
The Node runtime MUST validate isolate-originated serialized payload size before every host-side `JSON.parse` call that consumes isolate-originated data, and MUST fail requests that exceed the configured limit.

#### Scenario: Oversized serialized payload is rejected before parsing
- **WHEN** an isolate-originated payload exceeds the runtime JSON parse size limit
- **THEN** the runtime MUST fail the operation with a deterministic overflow error and MUST NOT call `JSON.parse` on that payload

#### Scenario: All isolate-originated parse entry points are guarded
- **WHEN** host runtime code in `packages/secure-exec/src/index.ts` parses isolate-originated JSON payloads for bridged operations
- **THEN** each parse entry point MUST apply the same pre-parse size validation before invoking `JSON.parse`

#### Scenario: In-limit serialized payload preserves existing behavior
- **WHEN** an isolate-originated payload is within the runtime JSON parse size limit and JSON-valid
- **THEN** the runtime MUST parse and process the request using existing bridge/runtime behavior
