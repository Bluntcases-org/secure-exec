// Browser runtime is temporarily disabled during the driver boundary refactor.

const DISABLED_MESSAGE =
	"Browser runtime support is temporarily disabled. See change driver-owned-node-runtime.";

self.onmessage = (event: MessageEvent<{ id: number }>) => {
	self.postMessage({
		id: event.data?.id ?? -1,
		ok: false,
		error: {
			message: DISABLED_MESSAGE,
		},
	});
};
