// Test 7: Node.js native WASI with custom imports
// Can we intercept syscalls using Node.js built-in WASI?
import { WASI } from "node:wasi";
import * as fs from "node:fs";
import * as path from "node:path";

async function main(): Promise<void> {
  console.log("Test 7: Node.js native WASI");
  console.log("===========================\n");

  // First, let's see what the WASI class provides
  const wasi = new WASI({
    version: "preview1",
    args: ["test"],
    env: {},
    preopens: {
      "/tmp": "/tmp",
    },
  });

  console.log("WASI object created");
  console.log("WASI methods:", Object.keys(wasi));
  console.log("WASI.wasiImport keys:", Object.keys(wasi.wasiImport));

  // Check if we can see the syscall functions
  console.log("\nAvailable WASI syscalls:");
  for (const [name, fn] of Object.entries(wasi.wasiImport)) {
    console.log(`  - ${name}: ${typeof fn}`);
  }

  // Try to wrap/intercept a syscall
  console.log("\n--- Testing syscall interception ---");
  const originalFdWrite = wasi.wasiImport.fd_write;

  // Can we override?
  const customWasiImport = {
    ...wasi.wasiImport,
    fd_write: (...args: unknown[]) => {
      console.log("[INTERCEPTED fd_write]");
      return (originalFdWrite as Function).apply(wasi.wasiImport, args);
    },
    // Try to add a custom proc_spawn handler
    proc_spawn: (...args: unknown[]) => {
      console.log("[INTERCEPTED proc_spawn] args:", args);
      // Return ENOSYS (function not supported)
      return 52;
    },
  };

  console.log("\nCustom WASI import object created with intercepted fd_write");
  console.log("Note: Node.js WASI only supports preview1, not WASIX extensions");

  // Check if proc_spawn exists in the standard WASI
  console.log("\nDoes standard WASI have proc_spawn?");
  console.log(
    "  proc_spawn in wasiImport:",
    "proc_spawn" in wasi.wasiImport
  );
  console.log(
    "  proc_exec in wasiImport:",
    "proc_exec" in wasi.wasiImport
  );

  // List all proc_* functions
  console.log("\nAll proc_* functions in WASI preview1:");
  for (const name of Object.keys(wasi.wasiImport)) {
    if (name.startsWith("proc_")) {
      console.log(`  - ${name}`);
    }
  }
}

main().catch(console.error);
