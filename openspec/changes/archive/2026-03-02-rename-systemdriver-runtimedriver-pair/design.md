## Context

The runtime already separates capability/config ownership from execution construction, but terminology still causes confusion because capability-side and execution-side contracts both read as runtime concerns. This change aligns names to intent.

## Goals / Non-Goals

**Goals:**
- Name capability-side contract `SystemDriver`.
- Name execution-side contract `RuntimeDriver` and its factory/options accordingly.
- Keep runtime behavior and security semantics unchanged.
- Apply names consistently across code, tests, docs, and examples.

**Non-Goals:**
- Changing execution semantics or permission behavior.
- Reworking module loading internals.

## Decisions

1. Rename top-level contracts instead of alias-only layering.
- Rationale: clear API surface and avoids perpetuating old ambiguity.

2. Rename constructor fields to match pair semantics.
- `NodeRuntimeOptions.driver` -> `systemDriver`
- `NodeRuntimeOptions.executionFactory` -> `runtimeDriverFactory`
- Rationale: makes call sites self-descriptive.

3. Keep Node-specific execution class name as-is for now.
- Rationale: scope control; core pair naming is the priority.

## Risks / Trade-offs

- [Breaking API] External call sites must update names. → Mitigation: update docs/examples/tests in the same change.
- [Partial rename drift] Missed symbols can cause confusion. → Mitigation: repository-wide symbol replacement and typecheck/test validation.
