## Context

Node runtime configuration currently supports overlapping ways to wire capabilities and permissions:
- `NodeProcess({ driver })`
- `NodeProcess({ filesystem, networkAdapter, commandExecutor, permissions })`
- `createNodeDriver(...)` with implicit `allowAll` when adapters are present and `permissions` is omitted.

This creates an ambiguous contract where equivalent-looking setups can produce different security posture. The architecture intent in this repository is already driver-based capability composition and deny-by-default permission enforcement, so the API should encode that intent directly.

## Goals / Non-Goals

**Goals:**
- Make Node runtime capability configuration single-path and explicit: `NodeProcess({ driver })`.
- Make permission policy single-source and explicit: `driver.permissions`.
- Remove implicit permissive behavior from driver construction.
- Preserve deny-by-default permission enforcement behavior and helper ergonomics (`allowAll*`) as explicit opt-in.
- Keep runtime/bridge permission semantics aligned with compatibility/security docs.

**Non-Goals:**
- Redesigning browser sandbox APIs in this change.
- Changing bridge scope or Node stdlib support tiers.
- Introducing automatic migration shims for old NodeProcess option shapes.

## Decisions

### 1. NodeProcess becomes driver-only for capabilities

Decision:
- Node capability wiring for filesystem/network/child-process is accepted only through `NodeProcessOptions.driver`.
- Deprecated top-level capability fields are removed from the contract rather than kept as aliases.

Rationale:
- Eliminates parallel configuration paths and precedence confusion.
- Makes runtime setup directly match the canonical “driver-based composition” architecture.

Alternatives considered:
- Keep legacy fields as aliases: rejected because it preserves ambiguity and weakens contract clarity.
- Keep fields but warn: rejected because the user explicitly does not want backward compatibility.

### 2. Permission policy is sourced only from `driver.permissions`

Decision:
- Node runtime wrappers (`wrapFileSystem`, `wrapNetworkAdapter`, `wrapCommandExecutor`, `filterEnv`) consume only `driver.permissions`.
- `NodeProcess` no longer accepts top-level `permissions` override.

Rationale:
- One source of truth avoids precedence bugs and policy drift.
- Keeps policy (permissions) separate from mechanism (adapters) while still delivering driver-first API ergonomics.

Alternatives considered:
- Merge permission callbacks into each adapter implementation: rejected because enforcement consistency and cross-domain policy composition become harder to verify.

### 3. Remove implicit `allowAll` fallback in `createNodeDriver`

Decision:
- `createNodeDriver(...)` no longer auto-populates `permissions: allowAll` when adapters exist.
- Permission helpers remain available but must be explicitly provided by callers.

Rationale:
- Security-critical defaults must be explicit at callsite.
- Aligns driver construction behavior with deny-by-default policy.

Alternatives considered:
- Keep implicit fallback for convenience only: rejected because it creates surprising privilege expansion compared with direct NodeProcess adapter construction.

### 4. Enforce strict contract at runtime for JS callers

Decision:
- When legacy top-level capability/permission fields are supplied to `NodeProcess`, constructor fails fast with a deterministic configuration error rather than silently ignoring fields.

Rationale:
- JS callers do not get TS compile-time guidance; fail-fast prevents silent misconfiguration.

Alternatives considered:
- Ignore unknown legacy fields: rejected due to silent behavior changes.

### 5. Require documentation and focused validation updates in the same change

Decision:
- Update public docs (`README`, `quickstart`, compatibility permission model section) and friction log alongside code changes.
- Run focused runtime + permission tests and type checks (pnpm/vitest/tsc workflow) for changed surfaces.

Rationale:
- API/security contract changes are high-friction if docs and validation lag.

Alternatives considered:
- Defer docs updates to follow-up: rejected due to governance and onboarding risk.

## Risks / Trade-offs

- [Immediate break for existing callers using top-level NodeProcess adapter fields] -> Mitigation: deterministic constructor error plus updated quickstart/README examples in same change.
- [Callers forget to provide explicit permissions after removing implicit `allowAll`] -> Mitigation: deny-by-default behavior remains deterministic and surfaced as `EACCES`; docs show explicit allow helpers.
- [Behavior drift between Node runtime policy and docs] -> Mitigation: compatibility-governance deltas require docs/friction synchronization in same change.

## Migration Plan

1. Update runtime/types to accept Node capabilities only through `driver` and to source permission policy only from `driver.permissions`.
2. Remove implicit permissive fallback in `createNodeDriver`.
3. Add/adjust tests for driver-only construction, fail-fast legacy field handling, and explicit permission behavior.
4. Update docs (`README`, `docs/quickstart.mdx`, `docs/node-compatability.mdx`) and `docs-internal/friction/sandboxed-node.md`.
5. Run focused validation (`pnpm vitest run ...`, `pnpm tsc --noEmit` in affected package/workspace scope).

Rollback:
- Reintroduce legacy NodeProcess option fields and `createNodeDriver` implicit permission fallback.
- Revert docs back to mixed-path API guidance.

## Open Questions

- Should `NodeProcess` reject legacy fields with one aggregated error message or first-invalid-field error?
- Should `createNodeDriver` enforce explicit `permissions` when any adapter exists (throw), or allow omitted policy and rely on runtime deny-by-default behavior?
