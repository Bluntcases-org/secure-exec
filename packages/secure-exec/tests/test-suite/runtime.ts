import { afterEach, expect, it } from "vitest";
import type {
	NodeRuntime,
	NodeRuntimeOptions,
} from "../../src/index.js";

export type DriverName = "node" | "browser";

export type DriverPair = {
	execDriver: DriverName;
	runtimeDriver: DriverName;
};

type RuntimeOptions = Omit<NodeRuntimeOptions, "systemDriver" | "runtimeDriverFactory">;

export type SharedSuiteContext = {
	pair: DriverPair;
	createRuntime(options?: RuntimeOptions): Promise<NodeRuntime>;
	teardown(): Promise<void>;
};

export function runRuntimeSuite(context: SharedSuiteContext): void {
	afterEach(async () => {
		await context.teardown();
	});

	it("executes scripts without runtime-managed stdout buffers", async () => {
		const runtime = await context.createRuntime();
		const result = await runtime.exec(`console.log("hello");`);
		expect(result.code).toBe(0);
		expect(result.errorMessage).toBeUndefined();
		expect(result).not.toHaveProperty("stdout");
		expect(result).not.toHaveProperty("stderr");
	});

	it("returns CommonJS exports from run()", async () => {
		const runtime = await context.createRuntime();
		const result = await runtime.run(
			`module.exports = { ok: true, runtimeDriver: "${context.pair.runtimeDriver}" };`,
		);
		expect(result.code).toBe(0);
		expect(result.exports).toEqual({
			ok: true,
			runtimeDriver: context.pair.runtimeDriver,
		});
	});

	it("returns ESM namespace exports from run()", async () => {
		const runtime = await context.createRuntime();
		const result = await runtime.run(
			`export const answer = 42; export default "ok";`,
			"/entry.mjs",
		);
		expect(result.code).toBe(0);
		expect(result.exports).toEqual({ answer: 42, default: "ok" });
	});

	it("drops high-volume logs by default to avoid buffering amplification", async () => {
		const runtime = await context.createRuntime();
		const result = await runtime.exec(`
      for (let i = 0; i < 2500; i += 1) {
        console.log("line-" + i);
      }
    `);
		expect(result.code).toBe(0);
		expect(result.errorMessage).toBeUndefined();
		expect(result).not.toHaveProperty("stdout");
		expect(result).not.toHaveProperty("stderr");
	});
}
