#!/usr/bin/env -S npx tsx
/**
 * Interactive shell inside the kernel.
 *
 * Usage:
 *   npx tsx scripts/shell.ts [--commands-dir <path>] [--no-node] [--no-python]
 */

import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createKernel, createInMemoryFileSystem } from "../packages/core/src/index.ts";
import { createWasmVmRuntime } from "../packages/wasmvm/src/index.ts";
import { createNodeRuntime } from "../packages/nodejs/src/kernel-runtime.ts";
import { createPythonRuntime } from "../packages/python/src/kernel-runtime.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Parse CLI flags
const args = process.argv.slice(2);
let commandsDir = resolve(__dirname, "../wasmvm/target/wasm32-wasip1/release/commands");
let mountNode = true;
let mountPython = true;

for (let i = 0; i < args.length; i++) {
	if (args[i] === "--commands-dir" && args[i + 1]) {
		commandsDir = resolve(args[++i]);
	} else if (args[i] === "--no-node") {
		mountNode = false;
	} else if (args[i] === "--no-python") {
		mountPython = false;
	}
}

// Set up kernel with VFS and drivers
const vfs = createInMemoryFileSystem();
const kernel = createKernel({ filesystem: vfs });

await kernel.mount(createWasmVmRuntime({ commandDirs: [commandsDir] }));
if (mountNode) await kernel.mount(createNodeRuntime());
if (mountPython) await kernel.mount(createPythonRuntime());

// Drop into the interactive shell
const exitCode = await kernel.connectTerminal();
await kernel.dispose();
process.exit(exitCode);
