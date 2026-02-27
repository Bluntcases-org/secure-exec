# node-bridge Specification

## Purpose
Define bridge boundary policy, third-party module boundaries, and capability expansion controls.

## Requirements

### Requirement: Bridge Scope Is Node Built-ins Only
Bridge implementations injected into isolated-vm MUST be limited to Node.js built-in modules and types compatible with `@types/node`.

#### Scenario: Bridge request targets a third-party package
- **WHEN** a proposed bridge module is not a Node.js built-in
- **THEN** the change MUST be rejected from the bridge layer and handled through normal sandboxed package resolution

### Requirement: Third-Party Modules Resolve from Sandboxed Dependencies
Third-party npm packages SHALL execute from sandboxed `node_modules` using normal runtime/module resolution behavior rather than bridge shims.

#### Scenario: Sandboxed app imports third-party server package
- **WHEN** sandboxed code imports a third-party package such as `@hono/node-server`
- **THEN** the package MUST resolve from sandboxed dependencies and MUST NOT rely on a host bridge shim for its primary runtime behavior

### Requirement: Capability Expansion Requires Explicit Approval
No new sandbox capability or host-exposed functionality MAY be added without explicit user approval and an agreed implementation plan, and implementation MUST pause until that approval is recorded.

#### Scenario: Change proposes new host-exposed API
- **WHEN** a proposal introduces a new sandbox capability beyond the current approved surface
- **THEN** implementation MUST pause until explicit approval and plan agreement are recorded

### Requirement: Active-Handle Bridge Globals Are Immutable
Bridge lifecycle globals used for active-handle tracking (`_registerHandle`, `_unregisterHandle`, `_waitForActiveHandles`) MUST be installed on `globalThis` as non-writable and non-configurable properties so sandbox code cannot replace runtime lifecycle hooks.

#### Scenario: Sandbox attempts to overwrite active-handle lifecycle hook
- **WHEN** sandboxed code assigns a new value to one of the active-handle lifecycle globals
- **THEN** the original bridge lifecycle function MUST remain installed and property descriptors MUST report `writable: false` and `configurable: false`

### Requirement: Prefer Standard Polyfills Over Custom Reimplementation
When a Node built-in compatibility layer exists in `node-stdlib-browser`, the project SHALL use that polyfill instead of introducing a custom replacement, unless a documented exception is approved.

#### Scenario: New built-in compatibility need is identified
- **WHEN** a Node built-in module requires browser/runtime compatibility support
- **THEN** maintainers MUST evaluate `node-stdlib-browser` first and only add custom behavior for explicitly documented gaps
