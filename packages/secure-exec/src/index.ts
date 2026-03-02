// Re-export core runtime surface.
export { NodeRuntime } from "./runtime.js";
export type { NodeRuntimeOptions } from "./runtime.js";

// Re-export public types.
export type {
	CommandExecutor,
	NetworkAdapter,
	Permissions,
	RuntimeDriver,
	RuntimeDriverFactory,
	SystemDriver,
	VirtualFileSystem,
} from "./types.js";
export type { DirEntry, StatInfo } from "./fs-helpers.js";
export type {
	StdioChannel,
	StdioEvent,
	StdioHook,
	ExecOptions,
	ExecResult,
	OSConfig,
	ProcessConfig,
	RunResult,
	TimingMitigation,
} from "./shared/api-types.js";

// Re-export Node driver factories.
export {
	createDefaultNetworkAdapter,
	createNodeDriver,
	createNodeRuntimeDriverFactory,
	NodeExecutionDriver,
	NodeFileSystem,
} from "./node/driver.js";
export type {
	ModuleAccessOptions,
	NodeRuntimeDriverFactoryOptions,
} from "./node/driver.js";

// Re-export browser driver factories.
export {
	createBrowserDriver,
	createBrowserNetworkAdapter,
	createBrowserRuntimeDriverFactory,
	createOpfsFileSystem,
} from "./browser/index.js";
export type {
	BrowserDriverOptions,
	BrowserRuntimeDriverFactoryOptions,
	BrowserRuntimeSystemOptions,
} from "./browser/index.js";

export { createInMemoryFileSystem } from "./shared/in-memory-fs.js";
export {
	allowAll,
	allowAllChildProcess,
	allowAllEnv,
	allowAllFs,
	allowAllNetwork,
} from "./shared/permissions.js";
