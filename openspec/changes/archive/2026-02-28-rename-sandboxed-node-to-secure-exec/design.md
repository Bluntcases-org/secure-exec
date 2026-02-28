## Context

The runtime has split naming today: package metadata and source layout still use `sandboxed-node`, while project docs and examples already describe the runtime as `secure-exec`. This inconsistency leaks into imports, workspace filters, and path-based governance checks. Renaming requires coordinated updates across package metadata, filesystem layout, internal references, and OpenSpec requirements that currently hardcode the old path.

## Goals / Non-Goals

**Goals:**
- Establish `secure-exec` as the single canonical runtime package/import name.
- Move runtime sources from `packages/sandboxed-node` to `packages/secure-exec`.
- Update repository imports and tooling references to the new package/path identity.
- Keep runtime, bridge, and driver behavior unchanged while applying rename-only refactors.
- Update OpenSpec governance/runtime deltas where requirements include old package paths.

**Non-Goals:**
- Changing runtime semantics, isolate behavior, bridge capability scope, or driver policy.
- Introducing compatibility shims that preserve `sandboxed-node` as a long-term alias.
- Reworking unrelated docs/spec content that does not reference package identity or moved paths.

## Decisions

### 1. Apply a hard rename for package and directory identity

Decision:
- Rename the package name to `secure-exec` and move the workspace directory to `packages/secure-exec` in the same change.

Rationale:
- A single canonical name removes import ambiguity and avoids permanently supporting dual identifiers.

Alternatives considered:
- Keep both names via alias package: rejected to avoid long-term maintenance overhead and unclear ownership.

### 2. Perform path migration with history-preserving move, then reference rewrites

Decision:
- Use a directory move (`git mv`) first, then update all path/import references repo-wide.

Rationale:
- Moving first preserves file history and makes subsequent reference updates deterministic.

Alternatives considered:
- Copy/create new package and delete old directory later: rejected because it obscures history and increases drift risk.

### 3. Update tooling and governance references as part of rename acceptance

Decision:
- Treat turbo/pnpm filters, package-local commands, and OpenSpec path requirements as required rename updates, not follow-up cleanup.

Rationale:
- Build/test flows and governance checks encode package identity through paths; rename is incomplete if these remain stale.

Alternatives considered:
- Defer governance and workflow updates to a separate change: rejected because it creates immediate policy/tooling breakage.

## Risks / Trade-offs

- [Downstream imports break on rename] -> Mitigation: mark as BREAKING, update docs/examples in same change, and provide clear migration notes in changelog/release notes.
- [Missed path string leaves CI or scripts broken] -> Mitigation: run repository-wide `sandboxed-node` search and only allow expected legacy references (for archived history where applicable).
- [Move impacts package-scoped commands] -> Mitigation: explicitly validate package-local typecheck/test/build commands from `packages/secure-exec`.
- [Spec/governance drift after path move] -> Mitigation: include OpenSpec deltas in same change for every requirement with hardcoded runtime package path.

## Migration Plan

1. Move `packages/sandboxed-node` to `packages/secure-exec`.
2. Rename package metadata (`name`) and adjust workspace/turbo references.
3. Rewrite internal imports and path references to `secure-exec` and `packages/secure-exec`.
4. Update OpenSpec/runtime-governance references with required deltas.
5. Run typecheck, targeted tests, and turbo build for the renamed package.
6. Verify no unintended `sandboxed-node` references remain outside approved legacy contexts.

Rollback:
- Revert the move and package-name changes in one commit if validation fails; because behavior changes are out of scope, rollback is path/metadata-only.

## Open Questions

- Should a short-lived deprecated `sandboxed-node` compatibility wrapper package be published for one release window, or should migration be immediate-only?
- Which historical docs are considered immutable archive content versus expected to receive rename rewrites?
