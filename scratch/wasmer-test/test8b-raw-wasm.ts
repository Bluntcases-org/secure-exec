// Test 8b: Raw WebAssembly with custom JS imports (no @wasmer/sdk)
// This tests if WASM can call back to JavaScript using native APIs

import { init, wat2wasm } from "@wasmer/sdk/node";

async function main(): Promise<void> {
  console.log("Test 8b: Raw WebAssembly with JS imports");
  console.log("=========================================\n");

  await init();

  // Create a simple WAT module that imports a function from JavaScript
  const wat = `
    (module
      ;; Import a function from the host
      (import "env" "js_callback" (func $js_callback (param i32)))
      (import "env" "js_log" (func $js_log (param i32 i32)))

      ;; Export memory so host can read/write
      (memory (export "memory") 1)

      ;; Store a string in memory
      (data (i32.const 0) "Hello from WASM!")

      ;; Main function
      (func (export "_start")
        ;; Call js_callback with argument 42
        i32.const 42
        call $js_callback

        ;; Call js_log with pointer to string and length
        i32.const 0   ;; pointer
        i32.const 16  ;; length
        call $js_log
      )
    )
  `;

  // Convert WAT to WASM bytes
  console.log("Converting WAT to WASM...");
  const wasmBytes = wat2wasm(wat);
  console.log(`WASM bytes: ${wasmBytes.length} bytes`);

  // Use raw WebAssembly API with custom imports
  console.log("\n--- Using WebAssembly.instantiate with custom imports ---\n");

  let callbackValue = 0;
  let loggedMessage = "";

  const imports = {
    env: {
      js_callback: (value: number) => {
        console.log(`[JS CALLBACK] Called with value = ${value}`);
        callbackValue = value;
      },
      js_log: (ptr: number, len: number) => {
        // Read string from WASM memory
        const memory = instance.exports.memory as WebAssembly.Memory;
        const bytes = new Uint8Array(memory.buffer, ptr, len);
        const message = new TextDecoder().decode(bytes);
        console.log(`[JS LOG] Message from WASM: "${message}"`);
        loggedMessage = message;
      },
    },
  };

  let instance: WebAssembly.Instance;
  const result = await WebAssembly.instantiate(wasmBytes, imports);
  instance = result.instance;

  console.log("WASM module instantiated successfully!");
  console.log("Exports:", Object.keys(instance.exports));

  // Call _start
  const start = instance.exports._start as () => void;
  console.log("\nCalling _start...");
  start();

  console.log("\n=== Results ===");
  console.log(`Callback received value: ${callbackValue}`);
  console.log(`Log received message: "${loggedMessage}"`);

  if (callbackValue === 42 && loggedMessage === "Hello from WASM!") {
    console.log("\nSUCCESS! WASM can call JavaScript functions!");
    console.log("This proves bidirectional WASM-JS communication works.");
  }
}

main().catch(console.error);
