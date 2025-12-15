// Test 10: Create a custom Wasmer package with custom WASM
// Can we use Wasmer.fromWasm() or createPackage() with custom WASM?
import { init, wat2wasm, Wasmer, Runtime, Directory } from "@wasmer/sdk/node";

async function main(): Promise<void> {
  console.log("Test 10: Custom Wasmer package");
  console.log("==============================\n");

  await init();

  // Create a simple WASI-compatible WASM module
  // This one only uses standard WASI imports
  const wat = `
    (module
      ;; WASI imports
      (import "wasi_snapshot_preview1" "fd_write"
        (func $fd_write (param i32 i32 i32 i32) (result i32)))
      (import "wasi_snapshot_preview1" "proc_exit"
        (func $proc_exit (param i32)))

      ;; Memory
      (memory (export "memory") 1)

      ;; String data
      (data (i32.const 0) "Hello from custom WASM package!\\n")

      ;; iov structure at offset 100
      (data (i32.const 100) "\\00\\00\\00\\00\\20\\00\\00\\00")

      ;; nwritten at offset 200
      (data (i32.const 200) "\\00\\00\\00\\00")

      (func (export "_start")
        ;; Write to stdout
        i32.const 1      ;; fd = stdout
        i32.const 100    ;; iovs
        i32.const 1      ;; iovs_len
        i32.const 200    ;; nwritten
        call $fd_write
        drop

        ;; Exit with code 0
        i32.const 0
        call $proc_exit
      )
    )
  `;

  console.log("Creating WASI-compatible WASM module...");
  const wasmBytes = wat2wasm(wat);
  console.log(`WASM bytes: ${wasmBytes.length} bytes`);

  // Try Wasmer.fromWasm()
  console.log("\n--- Testing Wasmer.fromWasm() ---");
  try {
    const pkg = Wasmer.fromWasm(wasmBytes);
    console.log("Package created!");
    console.log("Package type:", typeof pkg);
    console.log("Entrypoint:", pkg.entrypoint);
    console.log("Commands:", Object.keys(pkg.commands || {}));

    if (pkg.entrypoint) {
      console.log("\nRunning entrypoint...");
      const instance = await pkg.entrypoint.run({});
      const output = await instance.wait();
      console.log("Exit code:", output.code);
      console.log("Stdout:", output.stdout);
      console.log("Stderr:", output.stderr);
    }
  } catch (e: unknown) {
    const err = e as Error;
    console.log("Wasmer.fromWasm() failed:", err.message);
  }

  // Try Wasmer.createPackage()
  console.log("\n--- Testing Wasmer.createPackage() ---");
  try {
    // Create package with manifest
    const pkg = await Wasmer.createPackage({
      command: [
        {
          name: "hello",
          module: "hello.wasm",
          runner: "https://webc.org/runner/wasi",
        },
      ],
      fs: {
        "hello.wasm": { data: wasmBytes, modified: new Date() },
      },
    });

    console.log("Package created with createPackage!");
    console.log("Entrypoint:", pkg.entrypoint);
    console.log("Commands:", Object.keys(pkg.commands || {}));

    // Try running the command
    if (pkg.commands && pkg.commands["hello"]) {
      console.log("\nRunning 'hello' command...");
      const instance = await pkg.commands["hello"].run({});
      const output = await instance.wait();
      console.log("Exit code:", output.code);
      console.log("Stdout:", output.stdout);
      console.log("Stderr:", output.stderr);
    }
  } catch (e: unknown) {
    const err = e as Error;
    console.log("Wasmer.createPackage() failed:", err.message);
    console.log(err.stack);
  }
}

main().catch(console.error);
