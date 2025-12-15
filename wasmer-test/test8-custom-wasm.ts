// Test 8: Create a simple WASM module with custom JS imports
// This tests if we can have a WASM module call back to JavaScript
import { init, wat2wasm, runWasix } from "@wasmer/sdk/node";

async function main(): Promise<void> {
  console.log("Test 8: Custom WASM with JS imports");
  console.log("====================================\n");

  await init();

  // Create a simple WAT module that imports a function from JavaScript
  // and calls it when executed
  const wat = `
    (module
      ;; Import a function from the host
      (import "env" "js_callback" (func $js_callback (param i32)))

      ;; Export memory so host can read/write
      (memory (export "memory") 1)

      ;; Main function that calls the JS callback
      (func (export "_start")
        ;; Call js_callback with argument 42
        i32.const 42
        call $js_callback
      )
    )
  `;

  console.log("WAT module:");
  console.log(wat);

  // Convert WAT to WASM bytes
  console.log("\nConverting WAT to WASM...");
  let wasmBytes: Uint8Array;
  try {
    wasmBytes = wat2wasm(wat);
    console.log(`WASM bytes: ${wasmBytes.length} bytes`);
  } catch (e) {
    console.log("wat2wasm failed:", e);
    return;
  }

  // Now try to run it with runWasix
  console.log("\nTrying to run with runWasix...");
  console.log("Note: runWasix may not support custom imports like 'env.js_callback'");

  try {
    const instance = await runWasix(wasmBytes, {
      args: [],
      env: {},
    });
    const output = await instance.wait();
    console.log("exit code:", output.code);
    console.log("stdout:", output.stdout);
    console.log("stderr:", output.stderr);
  } catch (e: unknown) {
    const err = e as Error;
    console.log("runWasix failed:", err.message);
    console.log("\nThis is expected - runWasix only provides WASI imports,");
    console.log("not custom imports like 'env.js_callback'");
  }

  // Try using raw WebAssembly API instead
  console.log("\n--- Testing raw WebAssembly.instantiate ---");
  try {
    let callbackValue = 0;

    const imports = {
      env: {
        js_callback: (value: number) => {
          console.log(`[JS CALLBACK CALLED] value = ${value}`);
          callbackValue = value;
        },
      },
    };

    const { instance } = await WebAssembly.instantiate(wasmBytes, imports);
    console.log("WASM module instantiated successfully!");
    console.log("Exports:", Object.keys(instance.exports));

    // Call _start
    const start = instance.exports._start as () => void;
    console.log("Calling _start...");
    start();

    console.log(`\nSUCCESS! Callback was called with value: ${callbackValue}`);
    console.log("This proves WASM can call back to JavaScript!");
  } catch (e: unknown) {
    const err = e as Error;
    console.log("WebAssembly.instantiate failed:", err.message);
  }
}

main().catch(console.error);
