## Context

The current runtime-driver integration tests have accumulated multiple naming patterns and orchestration entrypoints (`*.node.test.ts`, `*.browser.test.ts`, `test-context`, `orchestrator`, and `run*` suite modules). This makes it harder to identify the canonical shared runtime contract and to verify that all compatible `(execution driver, runtime driver)` pairs run the same assertions.

The requested target structure is explicit and flat:

- `packages/secure-exec/tests/test-suite.test.ts`
- `packages/secure-exec/tests/test-suite/{name}.ts`
- `packages/secure-exec/tests/exec-driver/{name}.test.ts`
- `packages/secure-exec/tests/runtime-driver/{name}.test.ts`

This change is a test-architecture refactor and must preserve current behavior coverage while reducing structural complexity.

## Goals / Non-Goals

**Goals:**
- Establish one canonical shared test-suite entrypoint at `tests/test-suite.test.ts` that owns compatibility matrix orchestration.
- Flatten shared runtime-contract suites into `tests/test-suite/*.ts` modules with no nested "shared" folders or behavior suffix naming.
- Enforce that every compatible `(exec driver, runtime driver)` pair executes the same shared suite list, with no pair-specific exclusions.
- Isolate non-shareable assertions into `tests/exec-driver/*.test.ts` and `tests/runtime-driver/*.test.ts`.
- Keep test runtime under existing project constraints by running targeted suites and avoiding full-repo test runs.

**Non-Goals:**
- Changing secure-exec runtime semantics or driver compatibility rules.
- Expanding the supported browser engine matrix in this refactor.
- Introducing legacy alias files or duplicate suite entrypoints for backward naming compatibility.

## Decisions

### 1. Use a single matrix orchestrator file

- **Choice:** `tests/test-suite.test.ts` is the only shared-suite orchestrator and defines the compatibility matrix for `(exec driver, runtime driver)` pairs.
- **Rationale:** One entrypoint removes ambiguity about where cross-driver parity is validated.
- **Alternative considered:** Keep separate node/browser runtime-contract entrypoints; rejected because it duplicates orchestration and invites drift.

### 2. Keep shared suites flat and runtime-focused

- **Choice:** Shared suites live directly under `tests/test-suite/` using concise names (for example `runtime.ts`, `browser-options.ts` when shared).
- **Rationale:** Flat structure improves discoverability and aligns with the requested simplified layout.
- **Alternative considered:** Keep `run-*.ts` naming with nested subfolders; rejected because it preserves existing indirection.

### 3. Separate driver-specific tests by responsibility

- **Choice:** Assertions that cannot be universal move to `tests/exec-driver/*.test.ts` or `tests/runtime-driver/*.test.ts`.
- **Rationale:** This keeps the shared suite purely matrix-applied while still allowing targeted driver coverage.
- **Alternative considered:** Keep conditional branches inside shared suites; rejected because it violates "all tests apply to all compatible drivers" and increases cognitive load.

### 4. No legacy test-layout compatibility layer

- **Choice:** Rename/move files directly and update vitest wiring to the new layout without compatibility wrappers.
- **Rationale:** Avoids maintaining duplicate paths and duplicate execution.
- **Alternative considered:** Temporary re-export shims from old paths; rejected due to ongoing maintenance overhead and confusion.

### 5. Keep deterministic suite registration

- **Choice:** Shared suites are imported and registered in a stable, explicit order from `test-suite.test.ts`.
- **Rationale:** Stable ordering improves debuggability and avoids hidden discovery side effects.
- **Alternative considered:** Dynamic filesystem glob loading for suites; rejected because it obscures ordering and compatibility intent.

## Risks / Trade-offs

- [Missed coverage during migration] -> Mitigation: map each existing integration assertion to a destination file and verify parity with targeted node and browser suite runs.
- [Driver-pair compatibility drift] -> Mitigation: encode compatibility predicates in one matrix declaration used only by `test-suite.test.ts`.
- [Test runtime regressions from accidental duplication] -> Mitigation: remove duplicate node/browser orchestrators and confirm each shared assertion runs exactly once per compatible pair.
- [Contributor confusion during transition] -> Mitigation: update test governance/spec docs and include concrete path examples in tasks.

## Migration Plan

1. Define the compatibility matrix and suite registration contract in `tests/test-suite.test.ts`.
2. Move/rename shared integration suites into `tests/test-suite/{name}.ts` and adapt them to the new registration surface.
3. Move non-shareable assertions into `tests/exec-driver/*.test.ts` and `tests/runtime-driver/*.test.ts`.
4. Remove superseded orchestration/context files and update vitest/package scripts to run the new entrypoints.
5. Run targeted checks for the affected package:
   - `pnpm --filter secure-exec test -- tests/test-suite.test.ts`
   - `pnpm --filter secure-exec test -- tests/exec-driver/*.test.ts`
   - `pnpm --filter secure-exec test -- tests/runtime-driver/*.test.ts`
   - `pnpm --filter secure-exec check-types`
6. Update compatibility governance deltas so future runtime-driver changes use this structure.

## Open Questions

- Which file should own reusable matrix utility helpers, if any, when `test-suite.test.ts` grows (inline helpers vs a local `test-suite/utils.ts`)?
- Should driver-specific suites use per-driver filename suffixes (for example `node.test.ts`) or scenario names (for example `payload-limits.test.ts`) as the canonical convention?
