/**
 * Minimal filesystem interface for sandboxed-node.
 *
 * This interface abstracts the filesystem operations needed by the sandbox,
 * allowing different implementations (wasmer Directory, in-memory, etc.)
 */
export interface VirtualFileSystem {
	/**
	 * Read a file as binary data
	 * @throws Error if file doesn't exist
	 */
	readFile(path: string): Promise<Uint8Array>;

	/**
	 * Read a file as text (UTF-8)
	 * @throws Error if file doesn't exist
	 */
	readTextFile(path: string): Promise<string>;

	/**
	 * Read directory entries (file/folder names)
	 * @throws Error if directory doesn't exist
	 */
	readDir(path: string): Promise<string[]>;

	/**
	 * Write a file (creates parent directories as needed)
	 * @param path - Absolute path to the file
	 * @param content - String or binary content
	 */
	writeFile(path: string, content: string | Uint8Array): Promise<void>;

	/**
	 * Create a single directory level
	 * @throws Error if parent doesn't exist
	 */
	createDir(path: string): Promise<void>;

	/**
	 * Create a directory recursively (creates parent directories as needed)
	 * Should not throw if directory already exists
	 */
	mkdir(path: string): Promise<void>;

	/**
	 * Check if a path exists (file or directory)
	 */
	exists(path: string): Promise<boolean>;

	/**
	 * Remove a file
	 * @throws Error if file doesn't exist
	 */
	removeFile(path: string): Promise<void>;

	/**
	 * Remove an empty directory
	 * @throws Error if directory doesn't exist or is not empty
	 */
	removeDir(path: string): Promise<void>;
}
