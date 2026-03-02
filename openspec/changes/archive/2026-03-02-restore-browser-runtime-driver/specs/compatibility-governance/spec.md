## ADDED Requirements

### Requirement: Runtime Driver Contract Changes MUST Run Shared Cross-Target Integration Suites
Any change that modifies runtime-driver behavior or runtime orchestration contracts MUST run shared integration suites against both node and browser runtime-driver targets.

#### Scenario: Runtime/driver implementation changes trigger cross-target validation
- **WHEN** a change modifies runtime contracts or driver behavior under `packages/secure-exec/src/index.ts`, `src/runtime-driver.ts`, `src/node/**`, or `src/browser/**`
- **THEN** the change MUST execute shared integration suites for both node and browser targets before completion

#### Scenario: Shared suites are reused between targets
- **WHEN** runtime integration coverage is executed for node and browser
- **THEN** both targets MUST run the same reusable `run*` contract suites rather than target-specific duplicated logic

### Requirement: Browser Runtime Validation Workflow MUST Remain Available To Contributors
Repository scripts and test wiring MUST provide a documented way to run browser runtime integration tests locally using the shared runtime-contract suites.

#### Scenario: Contributor runs targeted browser integration validation
- **WHEN** a contributor runs the documented browser integration command
- **THEN** the runtime integration suite MUST execute in a real browser environment and report pass/fail for the shared contract suites
