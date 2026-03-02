import type {
	ExecOptions,
	ExecResult,
	RunResult,
} from "../shared/api-types.js";

export interface BrowserSandboxOptions {
	workerUrl?: URL | string;
}

const BROWSER_UNSUPPORTED_MESSAGE =
	"Browser runtime support is temporarily disabled. See change driver-owned-node-runtime.";

/**
 * Browser runtime is intentionally disabled during the driver boundary refactor.
 * A follow-up change will restore Worker-backed execution.
 */
export class BrowserSandbox {
	constructor(_options: BrowserSandboxOptions = {}) {
		throw new Error(BROWSER_UNSUPPORTED_MESSAGE);
	}

	async exec(_code: string, _options?: ExecOptions): Promise<ExecResult> {
		throw new Error(BROWSER_UNSUPPORTED_MESSAGE);
	}

	async run<T = unknown>(_code: string, _filePath?: string): Promise<RunResult<T>> {
		throw new Error(BROWSER_UNSUPPORTED_MESSAGE);
	}

	async dispose(): Promise<void> {
		throw new Error(BROWSER_UNSUPPORTED_MESSAGE);
	}
}

export { createInMemoryFileSystem } from "../shared/in-memory-fs.js";
