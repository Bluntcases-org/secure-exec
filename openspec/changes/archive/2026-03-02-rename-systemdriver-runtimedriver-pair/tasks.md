## 1. Core Type Renames

- [x] 1.1 Rename capability-side `RuntimeDriver` contracts/types to `SystemDriver`.
- [x] 1.2 Rename execution-side `RuntimeExecutionDriver*` contracts/types to `RuntimeDriver*`.
- [x] 1.3 Update exports/re-exports to expose the new names.

## 2. Runtime and Node Wiring

- [x] 2.1 Update `NodeRuntimeOptions` and constructor fields to `systemDriver` + `runtimeDriverFactory`.
- [x] 2.2 Update Node driver factory naming/typing to match new pair semantics.
- [x] 2.3 Update browser typings/imports impacted by renamed contracts.

## 3. Documentation and Validation

- [x] 3.1 Update docs/examples/tests to new names.
- [x] 3.2 Run targeted typecheck/tests.
- [x] 3.3 Mark tasks complete and confirm OpenSpec status.
