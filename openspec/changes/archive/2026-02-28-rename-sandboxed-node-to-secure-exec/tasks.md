## 1. Rename Runtime Package Identity

- [x] 1.1 Move `packages/sandboxed-node` to `packages/secure-exec` while preserving file history.
- [x] 1.2 Update `packages/secure-exec/package.json` name/export metadata to `secure-exec`.
- [x] 1.3 Update workspace and build configuration (pnpm/turbo filters and package path references) to the new directory/package name.

## 2. Rewrite Imports and Path References

- [x] 2.1 Replace internal runtime imports from `sandboxed-node` to `secure-exec` across packages, tests, scripts, and docs.
- [x] 2.2 Replace hardcoded repository paths from `packages/sandboxed-node` to `packages/secure-exec`.
- [x] 2.3 Verify only intentional legacy/archive references to `sandboxed-node` remain after replacement.

## 3. Align Governance and Compatibility Artifacts

- [x] 3.1 Update OpenSpec/governance references that hardcode runtime package paths so bridge checks and matrix policy target `packages/secure-exec`.
- [x] 3.2 Update compatibility docs/examples that describe package imports so they use `secure-exec` consistently.
- [x] 3.3 Add migration notes for the breaking import rename (`sandboxed-node` -> `secure-exec`).

## 4. Validate Renamed Package Workflows

- [x] 4.1 Run type checks for the renamed package (`pnpm -C packages/secure-exec check-types` and required workspace `tsc` checks).
- [x] 4.2 Run runtime tests for the renamed package (`pnpm -C packages/secure-exec test` or targeted vitest suites as appropriate).
- [x] 4.3 Run build verification with turbo for the renamed package (`pnpm turbo build --filter secure-exec`).
