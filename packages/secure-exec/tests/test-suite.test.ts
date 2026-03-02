import { describe } from "vitest";
import {
	NodeRuntime,
	allowAllNetwork,
	createBrowserDriver,
	createBrowserRuntimeDriverFactory,
} from "../src/browser-runtime.js";
import type { NodeRuntimeOptions } from "../src/browser-runtime.js";
import {
	runRuntimeSuite,
	type DriverName,
	type DriverPair,
	type SharedSuiteContext,
} from "./test-suite/runtime.js";

type RuntimeOptions = Omit<NodeRuntimeOptions, "systemDriver" | "runtimeDriverFactory">;
type SharedSuite = (context: SharedSuiteContext) => void;

const EXEC_DRIVERS: DriverName[] = ["node", "browser"];
const RUNTIME_DRIVERS: DriverName[] = ["node", "browser"];

const DRIVER_MATRIX: DriverPair[] = EXEC_DRIVERS.flatMap((execDriver) =>
	RUNTIME_DRIVERS.map((runtimeDriver) => ({ execDriver, runtimeDriver })),
);

const COMPATIBLE_PAIRS = new Set<string>(["node:node", "browser:browser"]);

const SHARED_SUITES: SharedSuite[] = [runRuntimeSuite];

function pairKey(pair: DriverPair): string {
	return `${pair.execDriver}:${pair.runtimeDriver}`;
}

function isCompatiblePair(pair: DriverPair): boolean {
	return COMPATIBLE_PAIRS.has(pairKey(pair));
}

function isNodeTargetAvailable(): boolean {
	return typeof process !== "undefined" && Boolean(process.versions?.node);
}

function isBrowserTargetAvailable(): boolean {
	return typeof window !== "undefined" && typeof Worker !== "undefined";
}

function isAvailablePair(pair: DriverPair): boolean {
	if (pair.execDriver === "node" && pair.runtimeDriver === "node") {
		return isNodeTargetAvailable();
	}
	if (pair.execDriver === "browser" && pair.runtimeDriver === "browser") {
		return isBrowserTargetAvailable();
	}
	return false;
}

function createSuiteContext(pair: DriverPair): SharedSuiteContext {
	const runtimes = new Set<NodeRuntime>();

	return {
		pair,
		async createRuntime(options: RuntimeOptions = {}): Promise<NodeRuntime> {
			let runtime: NodeRuntime;

			if (pair.execDriver === "node" && pair.runtimeDriver === "node") {
				const {
					createNodeDriver,
					createNodeRuntimeDriverFactory,
				} = await import("../src/index.js");
				runtime = new NodeRuntime({
					...options,
					systemDriver: createNodeDriver({}),
					runtimeDriverFactory: createNodeRuntimeDriverFactory(),
				});
			} else if (
				pair.execDriver === "browser" &&
				pair.runtimeDriver === "browser"
			) {
				const systemDriver = await createBrowserDriver({
					filesystem: "memory",
					useDefaultNetwork: true,
					permissions: allowAllNetwork,
				});
				runtime = new NodeRuntime({
					...options,
					systemDriver,
					runtimeDriverFactory: createBrowserRuntimeDriverFactory({
						workerUrl: new URL("../src/browser/worker.ts", import.meta.url),
					}),
				});
			} else {
				throw new Error(`Unsupported driver pair: ${pairKey(pair)}`);
			}

			runtimes.add(runtime);
			return runtime;
		},
		async teardown(): Promise<void> {
			const runtimeList = Array.from(runtimes);
			runtimes.clear();

			for (const runtime of runtimeList) {
				try {
					await runtime.terminate();
				} catch {
					runtime.dispose();
				}
			}
		},
	};
}

describe("test suite", () => {
	for (const pair of DRIVER_MATRIX) {
		if (!isCompatiblePair(pair)) {
			continue;
		}

		const label = `exec-driver:${pair.execDriver} runtime-driver:${pair.runtimeDriver}`;
		if (!isAvailablePair(pair)) {
			describe.skip(label, () => {});
			continue;
		}

		const context = createSuiteContext(pair);
		describe(label, () => {
			for (const runSuite of SHARED_SUITES) {
				runSuite(context);
			}
		});
	}
});
