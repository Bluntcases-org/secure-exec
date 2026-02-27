import ivm from "isolated-vm";
import type { TimingMitigation } from "./shared/api-types.js";

export const DEFAULT_TIMING_MITIGATION: TimingMitigation = "freeze";
export const TIMEOUT_EXIT_CODE = 124;
export const TIMEOUT_ERROR_MESSAGE = "CPU time limit exceeded";

export class ExecutionTimeoutError extends Error {
	constructor() {
		super(TIMEOUT_ERROR_MESSAGE);
		this.name = "ExecutionTimeoutError";
	}
}

export function createIsolate(memoryLimit: number): ivm.Isolate {
	return new ivm.Isolate({ memoryLimit });
}

export function getExecutionDeadlineMs(timeoutMs?: number): number | undefined {
	if (timeoutMs === undefined) {
		return undefined;
	}
	return Date.now() + timeoutMs;
}

export function getExecutionRunOptions(
	executionDeadlineMs?: number,
): Pick<ivm.ScriptRunOptions, "timeout"> {
	if (executionDeadlineMs === undefined) {
		return {};
	}
	const remainingMs = Math.floor(executionDeadlineMs - Date.now());
	if (remainingMs <= 0) {
		throw new ExecutionTimeoutError();
	}
	return { timeout: Math.max(1, remainingMs) };
}

export async function runWithExecutionDeadline<T>(
	operation: Promise<T>,
	executionDeadlineMs?: number,
): Promise<T> {
	if (executionDeadlineMs === undefined) {
		return operation;
	}
	const remainingMs = Math.floor(executionDeadlineMs - Date.now());
	if (remainingMs <= 0) {
		throw new ExecutionTimeoutError();
	}
	return await new Promise<T>((resolve, reject) => {
		const timer = setTimeout(() => reject(new ExecutionTimeoutError()), remainingMs);
		operation.then(
			(value) => {
				clearTimeout(timer);
				resolve(value);
			},
			(err) => {
				clearTimeout(timer);
				reject(err);
			},
		);
	});
}

export function isExecutionTimeoutError(error: unknown): boolean {
	if (error instanceof ExecutionTimeoutError) {
		return true;
	}
	const message = error instanceof Error ? error.message : String(error);
	return /timed out|time limit exceeded/i.test(message);
}
