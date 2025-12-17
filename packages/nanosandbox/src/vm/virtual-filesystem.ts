/**
 * VirtualFileSystem implementation for nanosandbox.
 *
 * This wraps the wasmer Directory API and handles path normalization
 * for the /data mount path.
 *
 * In WASM, the Directory is mounted at /data, so:
 * - Files written to Directory at /foo.txt appear at /data/foo.txt in WASM
 * - This VirtualFileSystem accepts both paths and normalizes them
 *
 * For paths NOT in /data (e.g., /usr/bin from webc), it falls back to
 * shell commands (cat, ls) via the runShellCommand callback.
 */
import type { Directory } from "@wasmer/sdk/node";
import type { VirtualFileSystem } from "sandboxed-node";
import { DATA_MOUNT_PATH } from "../wasix/index.js";

/**
 * Result from running a shell command
 */
export interface ShellResult {
	stdout: string;
	stderr: string;
	code: number;
}

/**
 * Check if a path is in the Directory mount (starts with /data)
 * Only /data/* paths are read from Directory.
 * All other paths should be read via shell commands.
 */
function isDataPath(path: string): boolean {
	return path.startsWith(DATA_MOUNT_PATH + "/") || path === DATA_MOUNT_PATH;
}

/**
 * Normalize a filesystem path for Directory access.
 *
 * In WASM, the Directory is mounted at /data, so files appear at /data/foo.txt.
 * But the Directory API stores them at /foo.txt (without the /data prefix).
 *
 * This function strips the /data prefix when accessing the Directory.
 */
export function normalizePathForDirectory(path: string): string {
	if (path.startsWith(DATA_MOUNT_PATH + "/")) {
		return path.slice(DATA_MOUNT_PATH.length);
	}
	if (path === DATA_MOUNT_PATH) {
		return "/";
	}
	return path;
}

/**
 * Create a VirtualFileSystem that wraps a wasmer Directory.
 *
 * @param directory - The wasmer Directory instance
 * @param runShellCommand - Callback to run shell commands for fallback reads.
 *                          Used when paths don't exist in Directory (e.g., /usr/bin from webc).
 * @returns A VirtualFileSystem implementation
 */
export function createVirtualFileSystem(
	directory: Directory,
	runShellCommand: (
		command: string,
		args: string[],
	) => Promise<ShellResult>,
): VirtualFileSystem {
	/**
	 * Read a file - /data/* from Directory, everything else via shell
	 */
	async function readFileWithFallback(
		path: string,
		binary: boolean,
	): Promise<Uint8Array | string> {
		// /data/* paths are read from Directory
		if (isDataPath(path)) {
			const normalizedPath = normalizePathForDirectory(path);
			if (binary) {
				return await directory.readFile(normalizedPath);
			}
			return await directory.readTextFile(normalizedPath);
		}

		// All other paths are read via shell command
		const result = await runShellCommand("cat", [path]);
		if (result.code !== 0) {
			throw new Error(`Failed to read file: ${path}`);
		}
		if (binary) {
			return new TextEncoder().encode(result.stdout);
		}
		return result.stdout;
	}

	/**
	 * Read directory - /data/* from Directory, everything else via shell
	 */
	async function readDirWithFallback(path: string): Promise<string[]> {
		// /data/* paths are read from Directory
		if (isDataPath(path)) {
			const normalizedPath = normalizePathForDirectory(path);
			const entries = await directory.readDir(normalizedPath);
			return entries.map((entry) =>
				typeof entry === "string"
					? entry
					: (entry as { name: string }).name,
			);
		}

		// All other paths are read via shell command
		const result = await runShellCommand("ls", ["-1", path]);
		if (result.code !== 0) {
			throw new Error(`Failed to read directory: ${path}`);
		}
		return result.stdout
			.split("\n")
			.filter((line) => line.trim() !== "");
	}

	/**
	 * Validate that a path is in the /data mount for write operations.
	 * Write operations can only target the Directory (user files), not WASM system paths.
	 */
	function validateWritePath(path: string): string {
		if (!isDataPath(path)) {
			throw new Error(
				`Cannot write to path outside /data: ${path}. Use ${DATA_MOUNT_PATH}${path} instead.`,
			);
		}
		return normalizePathForDirectory(path);
	}

	return {
		readFile: async (path: string): Promise<Uint8Array> => {
			const result = await readFileWithFallback(path, true);
			return result as Uint8Array;
		},

		readTextFile: async (path: string): Promise<string> => {
			const result = await readFileWithFallback(path, false);
			return result as string;
		},

		readDir: async (path: string): Promise<string[]> => {
			return readDirWithFallback(path);
		},

		writeFile: async (path: string, content: string | Uint8Array): Promise<void> => {
			const normalizedPath = validateWritePath(path);
			// HACK: Workaround for wasmer-js Directory.writeFile missing truncate(true)
			// Bug: wasmer-js src/fs/directory.rs uses .write(true).create(true) but not .truncate(true)
			// Result: overwriting a file with shorter content leaves old bytes at the end
			// Fix: delete file before writing.
			try {
				await directory.removeFile(normalizedPath);
			} catch {
				// Ignore errors - file may not exist
			}
			await directory.writeFile(normalizedPath, content);
		},

		createDir: async (path: string): Promise<void> => {
			const normalizedPath = validateWritePath(path);
			await directory.createDir(normalizedPath);
		},

		removeFile: async (path: string): Promise<void> => {
			const normalizedPath = validateWritePath(path);
			await directory.removeFile(normalizedPath);
		},

		removeDir: async (path: string): Promise<void> => {
			const normalizedPath = validateWritePath(path);
			await directory.removeDir(normalizedPath);
		},

		/**
		 * Check if a path exists (file or directory).
		 * For /data/* paths, checks Directory. For others, uses shell.
		 */
		exists: async (path: string): Promise<boolean> => {
			if (isDataPath(path)) {
				const normalizedPath = normalizePathForDirectory(path);
				try {
					await directory.readFile(normalizedPath);
					return true;
				} catch {
					try {
						await directory.readDir(normalizedPath);
						return true;
					} catch {
						return false;
					}
				}
			}
			// For non-/data paths, try ls (for directories) then cat (for files)
			// This is more reliable than `test -e` in WASM shell
			const lsResult = await runShellCommand("ls", [path]);
			if (lsResult.code === 0) {
				return true;
			}
			const catResult = await runShellCommand("cat", [path]);
			return catResult.code === 0;
		},

		/**
		 * Create a directory recursively (creates parent directories as needed).
		 * Only works for /data/* paths.
		 */
		mkdir: async (path: string): Promise<void> => {
			const normalizedPath = validateWritePath(path);
			const parts = normalizedPath.split("/").filter(Boolean);
			let currentPath = "";
			for (const part of parts) {
				currentPath += `/${part}`;
				try {
					await directory.createDir(currentPath);
				} catch {
					// Directory may already exist
				}
			}
		},
	};
}
