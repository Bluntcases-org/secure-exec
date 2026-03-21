/**
 * @deprecated Canonical source moved to @secure-exec/nodejs (kernel-runtime.ts).
 * This file re-exports for backward compatibility.
 */
export {
  createNodeRuntime,
  createKernelCommandExecutor,
  createKernelVfsAdapter,
  createHostFallbackVfs,
} from '@secure-exec/nodejs';
export type { NodeRuntimeOptions } from '@secure-exec/nodejs';
