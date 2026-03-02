# Secure Exec SDK

Run sandboxed Node.js code using a driver-based runtime.

## Features

- **Minimal overhead**: TODO
- **Just a library**: TODO
- **Low memory overhead**: TODO

TODO:

- **Node runtime**: isolated-vm backed sandbox execution with driver-owned capability wiring.
- **Browser runtime**: temporarily disabled during the driver-owned runtime refactor.
- **Driver-based**: Provide a driver to map filesystem, network, and child_process.
- **Permissions**: Gate syscalls with custom allow/deny functions.
- **Opt-in system features**: Disable network/child_process/FS by omission.
