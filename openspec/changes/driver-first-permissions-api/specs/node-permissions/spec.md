## MODIFIED Requirements

### Requirement: Deny operations when no permission checker is provided
The system SHALL deny (throw `EACCES`) any filesystem, network, child-process, or environment-variable operation when the corresponding `PermissionCheck` callback is `undefined` in the active `driver.permissions` policy.

#### Scenario: Filesystem read without fs permission checker
- **WHEN** a sandboxed module calls `fs.readFile("/some/path")` and no `driver.permissions.fs` callback is provided
- **THEN** the operation SHALL throw an `EACCES` error with syscall `open` and the requested path

#### Scenario: Network fetch without network permission checker
- **WHEN** a sandboxed module calls `fetch("https://example.com")` and no `driver.permissions.network` callback is provided
- **THEN** the operation SHALL throw an `EACCES` error with syscall `connect` and the requested URL

#### Scenario: Child process spawn without childProcess permission checker
- **WHEN** a sandboxed module calls `child_process.spawn("ls", ["-la"])` and no `driver.permissions.childProcess` callback is provided
- **THEN** the operation SHALL throw an `EACCES` error with syscall `spawn` and the command name

#### Scenario: Environment variable read without env permission checker
- **WHEN** a sandboxed module accesses `process.env.SECRET_KEY` and no `driver.permissions.env` callback is provided
- **THEN** the access SHALL throw an `EACCES` error with syscall `access` and the key name

### Requirement: allowAll permission helper
The system SHALL export an `allowAll` constant of type `Permissions` where every domain checker (`fs`, `network`, `childProcess`, `env`) returns `{ allow: true }`.

#### Scenario: Sandbox created with allowAll permits all operations
- **WHEN** a `NodeProcess` is created with `driver.permissions: allowAll` and a filesystem adapter
- **THEN** all filesystem operations SHALL succeed without `EACCES` errors

#### Scenario: allowAll is a valid Permissions object
- **WHEN** `allowAll` is assigned to a variable of type `Permissions`
- **THEN** it SHALL compile without type errors

### Requirement: Per-domain permission helpers
The system SHALL export per-domain allow helpers: `allowAllFs`, `allowAllNetwork`, `allowAllChildProcess`, `allowAllEnv`. Each SHALL be a partial `Permissions` object containing only the corresponding domain checker returning `{ allow: true }`.

#### Scenario: Compose per-domain helpers for selective access
- **WHEN** a `NodeProcess` is created with `driver.permissions: { ...allowAllFs, ...allowAllNetwork }` and both filesystem and network adapters
- **THEN** filesystem and network operations SHALL succeed, while child-process and env operations SHALL throw `EACCES`

## ADDED Requirements

### Requirement: Driver Construction MUST NOT Apply Implicit Permissive Policy
`createNodeDriver(...)` MUST NOT implicitly assign permissive permission policy when capability adapters are present and `permissions` is omitted.

#### Scenario: Driver is constructed with adapters and no permissions
- **WHEN** a caller creates a driver with filesystem/network/child-process adapters and does not provide `permissions`
- **THEN** the resulting driver MUST NOT behave as if `allowAll` was configured implicitly

#### Scenario: Caller opts into permissive policy explicitly
- **WHEN** a caller creates a driver with `permissions: allowAll`
- **THEN** operations in all permission domains MUST be permitted subject to adapter availability
