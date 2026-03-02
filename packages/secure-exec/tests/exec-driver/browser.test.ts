import { afterEach, describe, expect, it } from "vitest";
import {
	NodeRuntime,
	allowAllNetwork,
	createBrowserDriver,
	createBrowserRuntimeDriverFactory,
} from "../../src/browser-runtime.js";
import type { NodeRuntimeOptions } from "../../src/browser-runtime.js";

const IS_BROWSER_ENV =
	typeof window !== "undefined" && typeof Worker !== "undefined";

type RuntimeOptions = Omit<NodeRuntimeOptions, "systemDriver" | "runtimeDriverFactory">;

describe.skipIf(!IS_BROWSER_ENV)("exec driver specific: browser", () => {
	const runtimes = new Set<NodeRuntime>();

	const createRuntime = async (
		options: RuntimeOptions = {},
	): Promise<NodeRuntime> => {
		const systemDriver = await createBrowserDriver({
			filesystem: "memory",
			useDefaultNetwork: true,
			permissions: allowAllNetwork,
		});
		const runtime = new NodeRuntime({
			...options,
			systemDriver,
			runtimeDriverFactory: createBrowserRuntimeDriverFactory({
				workerUrl: new URL("../../src/browser/worker.ts", import.meta.url),
			}),
		});
		runtimes.add(runtime);
		return runtime;
	};

	afterEach(async () => {
		const runtimeList = Array.from(runtimes);
		runtimes.clear();

		for (const runtime of runtimeList) {
			try {
				await runtime.terminate();
			} catch {
				runtime.dispose();
			}
		}
	});

	it("keeps DNS lookup on deterministic browser ENOSYS contract", async () => {
		const runtime = await createRuntime();
		await expect(runtime.network.dnsLookup("example.com")).resolves.toEqual({
			error: "DNS not supported in browser",
			code: "ENOSYS",
		});
	});
});
