export function createInitialBridgeGlobalsCode(options: {
	initialCwd: string;
	jsonPayloadLimitBytes: number;
	payloadLimitErrorCode: string;
	isolateGlobalExposureHelperSource: string;
}): string {
	const {
		initialCwd,
		jsonPayloadLimitBytes,
		payloadLimitErrorCode,
		isolateGlobalExposureHelperSource,
	} = options;
	return `
      var { exposeMutableRuntimeStateGlobal: __runtimeExposeMutableGlobal } = ${isolateGlobalExposureHelperSource};
      __runtimeExposeMutableGlobal("_moduleCache", {});
      // Set up built-ins that have no bridge/polyfill implementation.
      globalThis._moduleCache['v8'] = {
        getHeapStatistics: function() {
          return {
            total_heap_size: 67108864,
            total_heap_size_executable: 1048576,
            total_physical_size: 67108864,
            total_available_size: 67108864,
            used_heap_size: 52428800,
            heap_size_limit: 134217728,
            malloced_memory: 8192,
            peak_malloced_memory: 16384,
            does_zap_garbage: 0,
            number_of_native_contexts: 1,
            number_of_detached_contexts: 0,
            external_memory: 0
          };
        },
        getHeapSpaceStatistics: function() { return []; },
        getHeapCodeStatistics: function() { return {}; },
        setFlagsFromString: function() {},
        serialize: function(value) { return Buffer.from(JSON.stringify(value)); },
        deserialize: function(buffer) {
          const text = buffer.toString();
          if (Buffer.byteLength(text, "utf8") > ${jsonPayloadLimitBytes}) {
            throw new Error("${payloadLimitErrorCode}: v8.deserialize exceeds ${jsonPayloadLimitBytes} bytes");
          }
          return JSON.parse(text);
        },
        cachedDataVersionTag: function() { return 0; }
      };
      __runtimeExposeMutableGlobal("_pendingModules", {});
      __runtimeExposeMutableGlobal("_currentModule", { dirname: ${JSON.stringify(initialCwd)} });
    `;
}
