// Test 9: WASI + Custom imports combined
// Can we add custom imports alongside WASI for a unified runtime?
import { WASI } from "node:wasi";
import { init, wat2wasm } from "@wasmer/sdk/node";

async function main(): Promise<void> {
  console.log("Test 9: WASI + Custom JS imports");
  console.log("=================================\n");

  await init();

  // Create a WAT module that uses both WASI and custom imports
  const wat = `
    (module
      ;; WASI imports for fd_write (stdout)
      (import "wasi_snapshot_preview1" "fd_write"
        (func $fd_write (param i32 i32 i32 i32) (result i32)))

      ;; Custom import for Node.js bridging
      (import "bridge" "spawn_node" (func $spawn_node (param i32 i32) (result i32)))

      ;; Memory
      (memory (export "memory") 1)

      ;; String data
      (data (i32.const 0) "Hello from WASI!\\n")
      (data (i32.const 100) "script.js")

      ;; iov structure for fd_write at offset 200
      ;; iov.buf = pointer to string (0)
      ;; iov.len = length of string (17)
      (data (i32.const 200) "\\00\\00\\00\\00\\11\\00\\00\\00")

      ;; bytes written location at offset 300
      (data (i32.const 300) "\\00\\00\\00\\00")

      (func (export "_start")
        ;; First, write to stdout using WASI
        i32.const 1      ;; fd = 1 (stdout)
        i32.const 200    ;; iovs pointer
        i32.const 1      ;; iovs_len
        i32.const 300    ;; nwritten pointer
        call $fd_write
        drop

        ;; Now call our custom spawn_node function
        i32.const 100    ;; pointer to "script.js"
        i32.const 9      ;; length
        call $spawn_node
        drop
      )
    )
  `;

  console.log("Creating WASM module with WASI + custom imports...");
  const wasmBytes = wat2wasm(wat);
  console.log(`WASM bytes: ${wasmBytes.length} bytes`);

  // Create WASI instance
  const wasi = new WASI({
    version: "preview1",
    args: ["test"],
    env: {},
  });

  // Combine WASI imports with our custom bridge imports
  const imports = {
    wasi_snapshot_preview1: wasi.wasiImport,
    bridge: {
      spawn_node: (ptr: number, len: number): number => {
        // Read the script path from WASM memory
        const memory = instance.exports.memory as WebAssembly.Memory;
        const bytes = new Uint8Array(memory.buffer, ptr, len);
        const scriptPath = new TextDecoder().decode(bytes);

        console.log(`[BRIDGE] spawn_node called!`);
        console.log(`[BRIDGE] Script path: "${scriptPath}"`);
        console.log(`[BRIDGE] This is where we would call NodeProcess.spawn()!`);

        // Return 0 for success
        return 0;
      },
    },
  };

  console.log("\nInstantiating with combined imports...");
  let instance: WebAssembly.Instance;

  try {
    const result = await WebAssembly.instantiate(wasmBytes, imports);
    instance = result.instance;
    console.log("SUCCESS! Module instantiated with WASI + custom imports!");
    console.log("Exports:", Object.keys(instance.exports));

    // Start WASI - must use wasi.start() not direct _start call
    console.log("\nCalling wasi.start(instance)...");
    wasi.start(instance);

    console.log("\n=== This approach works! ===");
    console.log("We can combine WASI syscalls with custom bridge functions.");
    console.log("This means we could create a custom WASM binary that:");
    console.log("  1. Uses WASI for file/IO operations");
    console.log("  2. Uses bridge.spawn_node for Node.js process spawning");
  } catch (e: unknown) {
    const err = e as Error;
    console.log("Failed:", err.message);
    console.log(err.stack);
  }
}

main().catch(console.error);
