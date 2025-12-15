## lightweight sandboxes

- uses wasix for linux vm
    - gives you the real coreutils, not the fake js implementations
    - gives support for python, etc
- uses isolated-vm for the js isolation
    - high perf is needed for native js (eg nextjs)
    - quickjs (without wasm) is 45x (https://zoo.js.org/?arch=amd64) faster than quickjs even when compiled to js
    - lower memory overhead when using isolates

## webcontainers

- emulates linux vm/posix in javascript vs we use wasix so you have the real tool and not some knock off with the wrong impl
- uses serviceworkers for isolation

## openwebcontainers

- emulates linux vm/poxis in js
- uses quickjs for isolation

## other options not considered

- spidermonkey in wasm instead of native js bridge

