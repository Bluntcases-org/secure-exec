## ADDED Requirements

### Requirement: Runtime-Driver Contract Changes MUST Validate Through Canonical Test-Suite Entrypoints
Any change that modifies runtime-driver behavior, execution-driver behavior, or shared runtime test harness contracts MUST validate against canonical shared and driver-specific test entrypoints.

#### Scenario: Shared runtime contract change triggers matrix suite validation
- **WHEN** a change updates runtime contract behavior or shared suite orchestration under `packages/secure-exec/tests/test-suite.test.ts` or `packages/secure-exec/tests/test-suite/*.ts`
- **THEN** the change MUST run the matrix suite command that executes `packages/secure-exec/tests/test-suite.test.ts`

#### Scenario: Execution-driver-specific change triggers execution-driver suite validation
- **WHEN** a change updates execution-driver-specific behavior or tests under `packages/secure-exec/tests/exec-driver/`
- **THEN** the change MUST run the execution-driver targeted test command that executes `packages/secure-exec/tests/exec-driver/*.test.ts`

#### Scenario: Runtime-driver-specific change triggers runtime-driver suite validation
- **WHEN** a change updates runtime-driver-specific behavior or tests under `packages/secure-exec/tests/runtime-driver/`
- **THEN** the change MUST run the runtime-driver targeted test command that executes `packages/secure-exec/tests/runtime-driver/*.test.ts`

### Requirement: Shared Runtime Coverage MUST Not Depend On Legacy Or Duplicate Entrypoints
Repository test wiring MUST keep `packages/secure-exec/tests/test-suite.test.ts` as the canonical shared runtime matrix entrypoint and MUST NOT require duplicated node/browser-only shared-suite entrypoints for ongoing validation.

#### Scenario: Canonical shared runtime entrypoint remains singular
- **WHEN** contributors update package scripts or Vitest include patterns for shared runtime coverage
- **THEN** shared runtime matrix execution MUST remain anchored on `packages/secure-exec/tests/test-suite.test.ts` as the canonical entrypoint
