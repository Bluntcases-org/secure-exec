import { afterEach, describe, expect, it } from "vitest";
import { allowAllFs, allowAllChildProcess } from "../../../src/index.js";
import type { CommandExecutor, SpawnedProcess } from "../../../src/types.js";
import { createTestNodeRuntime } from "../../test-utils.js";
import type { NodeRuntime } from "../../../src/index.js";

type CapturedConsoleEvent = {
	channel: "stdout" | "stderr";
	message: string;
};

function createConsoleCapture() {
	const events: CapturedConsoleEvent[] = [];
	return {
		onStdio: (event: CapturedConsoleEvent) => {
			events.push(event);
		},
		stdout: () =>
			events
				.filter((e) => e.channel === "stdout")
				.map((e) => e.message)
				.join(""),
		allText: () => events.map((e) => e.message).join(""),
	};
}

/**
 * CommandExecutor that emits a configurable amount of stdout bytes.
 * Each spawn emits `outputBytes` of 'A' characters then exits 0.
 */
function createLargeOutputExecutor(outputBytes: number): CommandExecutor {
	return {
		spawn(
			_command: string,
			_args: string[],
			options: {
				cwd?: string;
				env?: Record<string, string>;
				onStdout?: (data: Uint8Array) => void;
				onStderr?: (data: Uint8Array) => void;
			},
		): SpawnedProcess {
			let exitResolve: (code: number) => void;
			const waitPromise = new Promise<number>((r) => {
				exitResolve = r;
			});

			queueMicrotask(() => {
				// Emit output in 1KB chunks
				const chunkSize = 1024;
				for (let i = 0; i < outputBytes; i += chunkSize) {
					const size = Math.min(chunkSize, outputBytes - i);
					options.onStdout?.(new Uint8Array(size).fill(65));
				}
				exitResolve(0);
			});

			return {
				writeStdin() {},
				closeStdin() {},
				kill() {},
				wait: () => waitPromise,
			};
		},
	};
}

/**
 * CommandExecutor that emits configurable stdout and stderr bytes separately.
 */
function createStdoutStderrExecutor(
	stdoutBytes: number,
	stderrBytes: number,
): CommandExecutor {
	return {
		spawn(
			_command: string,
			_args: string[],
			options: {
				cwd?: string;
				env?: Record<string, string>;
				onStdout?: (data: Uint8Array) => void;
				onStderr?: (data: Uint8Array) => void;
			},
		): SpawnedProcess {
			let exitResolve: (code: number) => void;
			const waitPromise = new Promise<number>((r) => {
				exitResolve = r;
			});

			queueMicrotask(() => {
				const chunkSize = 1024;
				for (let i = 0; i < stdoutBytes; i += chunkSize) {
					const size = Math.min(chunkSize, stdoutBytes - i);
					options.onStdout?.(new Uint8Array(size).fill(65));
				}
				for (let i = 0; i < stderrBytes; i += chunkSize) {
					const size = Math.min(chunkSize, stderrBytes - i);
					options.onStderr?.(new Uint8Array(size).fill(66));
				}
				exitResolve(0);
			});

			return {
				writeStdin() {},
				closeStdin() {},
				kill() {},
				wait: () => waitPromise,
			};
		},
	};
}

describe("child_process maxBuffer enforcement", () => {
	let proc: NodeRuntime | undefined;

	afterEach(() => {
		proc?.dispose();
		proc = undefined;
	});

	// -----------------------------------------------------------------------
	// execSync
	// -----------------------------------------------------------------------

	describe("execSync", () => {
		it("output within maxBuffer succeeds", async () => {
			const capture = createConsoleCapture();
			proc = createTestNodeRuntime({
				commandExecutor: createLargeOutputExecutor(500),
				permissions: { ...allowAllFs, ...allowAllChildProcess },
				onStdio: capture.onStdio,
			});

			const result = await proc.exec(`
				const { execSync } = require('child_process');
				const out = execSync('echo test', { maxBuffer: 1024 });
				console.log('len:' + out.length);
			`);

			expect(result.code).toBe(0);
			expect(capture.stdout()).toContain("len:");
		});

		it("throws ERR_CHILD_PROCESS_STDIO_MAXBUFFER when output exceeds maxBuffer", async () => {
			const capture = createConsoleCapture();
			// Executor produces 2MB of output
			proc = createTestNodeRuntime({
				commandExecutor: createLargeOutputExecutor(2 * 1024 * 1024),
				permissions: { ...allowAllFs, ...allowAllChildProcess },
				onStdio: capture.onStdio,
			});

			const result = await proc.exec(`
				const { execSync } = require('child_process');
				try {
					execSync('big-output', { maxBuffer: 1024 * 1024 });
					console.log('SHOULD_NOT_REACH');
				} catch (e) {
					console.log('code:' + e.code);
					console.log('message:' + e.message);
				}
			`);

			expect(result.code).toBe(0);
			const out = capture.stdout();
			expect(out).not.toContain("SHOULD_NOT_REACH");
			expect(out).toContain("code:ERR_CHILD_PROCESS_STDIO_MAXBUFFER");
		});

		it("throws with small maxBuffer", async () => {
			const capture = createConsoleCapture();
			proc = createTestNodeRuntime({
				commandExecutor: createLargeOutputExecutor(200),
				permissions: { ...allowAllFs, ...allowAllChildProcess },
				onStdio: capture.onStdio,
			});

			const result = await proc.exec(`
				const { execSync } = require('child_process');
				try {
					execSync('any-cmd', { maxBuffer: 100 });
					console.log('SHOULD_NOT_REACH');
				} catch (e) {
					console.log('code:' + e.code);
				}
			`);

			expect(result.code).toBe(0);
			const out = capture.stdout();
			expect(out).not.toContain("SHOULD_NOT_REACH");
			expect(out).toContain("code:ERR_CHILD_PROCESS_STDIO_MAXBUFFER");
		});

		it("uses default 1MB maxBuffer when not specified", async () => {
			const capture = createConsoleCapture();
			// Produce 2MB — should exceed default 1MB
			proc = createTestNodeRuntime({
				commandExecutor: createLargeOutputExecutor(2 * 1024 * 1024),
				permissions: { ...allowAllFs, ...allowAllChildProcess },
				onStdio: capture.onStdio,
			});

			const result = await proc.exec(`
				const { execSync } = require('child_process');
				try {
					execSync('big-output');
					console.log('SHOULD_NOT_REACH');
				} catch (e) {
					console.log('code:' + e.code);
				}
			`);

			expect(result.code).toBe(0);
			const out = capture.stdout();
			expect(out).not.toContain("SHOULD_NOT_REACH");
			expect(out).toContain("code:ERR_CHILD_PROCESS_STDIO_MAXBUFFER");
		});
	});

	// -----------------------------------------------------------------------
	// spawnSync
	// -----------------------------------------------------------------------

	describe("spawnSync", () => {
		it("returns error when stdout exceeds maxBuffer", async () => {
			const capture = createConsoleCapture();
			proc = createTestNodeRuntime({
				commandExecutor: createLargeOutputExecutor(500),
				permissions: { ...allowAllFs, ...allowAllChildProcess },
				onStdio: capture.onStdio,
			});

			const result = await proc.exec(`
				const { spawnSync } = require('child_process');
				const r = spawnSync('any', [], { maxBuffer: 100 });
				if (r.error) {
					console.log('code:' + r.error.code);
				} else {
					console.log('no-error');
				}
			`);

			expect(result.code).toBe(0);
			expect(capture.stdout()).toContain("code:ERR_CHILD_PROCESS_STDIO_MAXBUFFER");
		});

		it("respects maxBuffer on stderr independently", async () => {
			const capture = createConsoleCapture();
			// Small stdout, large stderr
			proc = createTestNodeRuntime({
				commandExecutor: createStdoutStderrExecutor(50, 500),
				permissions: { ...allowAllFs, ...allowAllChildProcess },
				onStdio: capture.onStdio,
			});

			const result = await proc.exec(`
				const { spawnSync } = require('child_process');
				const r = spawnSync('any', [], { maxBuffer: 100 });
				if (r.error) {
					console.log('code:' + r.error.code);
				} else {
					console.log('no-error');
				}
			`);

			expect(result.code).toBe(0);
			expect(capture.stdout()).toContain("code:ERR_CHILD_PROCESS_STDIO_MAXBUFFER");
		});

		it("no error when within maxBuffer", async () => {
			const capture = createConsoleCapture();
			proc = createTestNodeRuntime({
				commandExecutor: createLargeOutputExecutor(50),
				permissions: { ...allowAllFs, ...allowAllChildProcess },
				onStdio: capture.onStdio,
			});

			const result = await proc.exec(`
				const { spawnSync } = require('child_process');
				const r = spawnSync('any', [], { maxBuffer: 1000 });
				console.log('error:' + (r.error ? 'yes' : 'no'));
				console.log('stdout-len:' + r.stdout.length);
			`);

			expect(result.code).toBe(0);
			const out = capture.stdout();
			expect(out).toContain("error:no");
			expect(out).toContain("stdout-len:");
		});

		it("no maxBuffer enforcement when not specified", async () => {
			const capture = createConsoleCapture();
			// Produce 500 bytes — no maxBuffer set, should succeed
			proc = createTestNodeRuntime({
				commandExecutor: createLargeOutputExecutor(500),
				permissions: { ...allowAllFs, ...allowAllChildProcess },
				onStdio: capture.onStdio,
			});

			const result = await proc.exec(`
				const { spawnSync } = require('child_process');
				const r = spawnSync('any', []);
				console.log('error:' + (r.error ? 'yes' : 'no'));
			`);

			expect(result.code).toBe(0);
			expect(capture.stdout()).toContain("error:no");
		});
	});

	// -----------------------------------------------------------------------
	// execFileSync
	// -----------------------------------------------------------------------

	describe("execFileSync", () => {
		it("throws ERR_CHILD_PROCESS_STDIO_MAXBUFFER when output exceeds default maxBuffer", async () => {
			const capture = createConsoleCapture();
			proc = createTestNodeRuntime({
				commandExecutor: createLargeOutputExecutor(2 * 1024 * 1024),
				permissions: { ...allowAllFs, ...allowAllChildProcess },
				onStdio: capture.onStdio,
			});

			const result = await proc.exec(`
				const { execFileSync } = require('child_process');
				try {
					execFileSync('big-output', []);
					console.log('SHOULD_NOT_REACH');
				} catch (e) {
					console.log('code:' + e.code);
				}
			`);

			expect(result.code).toBe(0);
			const out = capture.stdout();
			expect(out).not.toContain("SHOULD_NOT_REACH");
			expect(out).toContain("code:ERR_CHILD_PROCESS_STDIO_MAXBUFFER");
		});

		it("succeeds within maxBuffer", async () => {
			const capture = createConsoleCapture();
			proc = createTestNodeRuntime({
				commandExecutor: createLargeOutputExecutor(50),
				permissions: { ...allowAllFs, ...allowAllChildProcess },
				onStdio: capture.onStdio,
			});

			const result = await proc.exec(`
				const { execFileSync } = require('child_process');
				const out = execFileSync('small-output', [], { maxBuffer: 1000 });
				console.log('len:' + out.length);
			`);

			expect(result.code).toBe(0);
			expect(capture.stdout()).toContain("len:");
		});
	});
});
