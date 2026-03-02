import { afterEach, describe, expect, it } from "vitest";
import {
	NodeRuntime,
	allowAllNetwork,
	createNodeDriver,
	createNodeRuntimeDriverFactory,
} from "../../src/index.js";
import type { NodeRuntimeOptions } from "../../src/index.js";

type RuntimeOptions = Omit<NodeRuntimeOptions, "systemDriver" | "runtimeDriverFactory">;

describe("exec driver specific: node", () => {
	const runtimes = new Set<NodeRuntime>();

	const createRuntime = (options: RuntimeOptions = {}): NodeRuntime => {
		const runtime = new NodeRuntime({
			...options,
			systemDriver: createNodeDriver({
				useDefaultNetwork: true,
				permissions: allowAllNetwork,
			}),
			runtimeDriverFactory: createNodeRuntimeDriverFactory(),
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

	it("keeps DNS lookup available through node execution driver", async () => {
		const runtime = createRuntime();
		const result = await runtime.network.dnsLookup("localhost");

		if ("error" in result) {
			throw new Error(`expected localhost DNS resolution, got: ${result.error}`);
		}

		expect(result.address.length).toBeGreaterThan(0);
	});

	it("supports fetch through node network adapter", async () => {
		const runtime = createRuntime();
		const result = await runtime.network.fetch(
			"data:text/plain,node-exec-driver-ok",
		);
		expect(result.ok).toBe(true);
		expect(result.body).toContain("node-exec-driver-ok");
	});
});
