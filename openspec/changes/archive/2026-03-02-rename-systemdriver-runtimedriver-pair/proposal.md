## Why

The current driver naming still conflates capability-side and execution-side ownership, making APIs harder to read and discuss. We want the names to map directly to responsibilities: `SystemDriver` for OS/capability simulation and `RuntimeDriver` for runtime execution management.

## What Changes

- Rename capability-side driver type from `RuntimeDriver` to `SystemDriver`.
- Rename execution-side contracts from `RuntimeExecutionDriver*` to `RuntimeDriver*`.
- Update Node runtime constructor and factory naming to reflect the new pair (`systemDriver` + `runtimeDriverFactory`).
- Keep behavior unchanged: deny-by-default, runtime config injection, and execution semantics remain the same.
- Update docs/examples/tests to use the new names.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `node-runtime`: API contract terminology for driver composition is renamed to `SystemDriver` (capability side) and `RuntimeDriver` (execution side) without runtime behavior changes.

## Impact

- Affected code: runtime driver typings, NodeRuntime constructor options, Node factory exports, tests/docs/examples.
- API impact: **BREAKING** public type/function names and constructor option field names are renamed.
- No new dependencies.
