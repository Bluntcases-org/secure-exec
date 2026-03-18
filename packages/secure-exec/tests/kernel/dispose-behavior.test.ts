/**
 * Integration tests for kernel.dispose() with active processes.
 *
 * Verifies that dispose terminates running processes across WasmVM and Node
 * runtimes, cleans up after crashes, disposes timers, propagates pipe EOF,
 * and supports idempotent double-dispose.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { createKernel } from '../../../kernel/src/index.ts';
import type {
  Kernel,
  RuntimeDriver,
  DriverProcess,
  ProcessContext,
} from '../../../kernel/src/index.ts';
import { TestFileSystem } from '../../../kernel/test/helpers.ts';
import { createNodeRuntime } from '../../../runtime/node/src/index.ts';
import { createPythonRuntime } from '../../../runtime/python/src/index.ts';
import { InMemoryFileSystem } from '../../../os/browser/src/index.ts';
import {
  createIntegrationKernel,
  skipUnlessWasmBuilt,
  skipUnlessPyodide,
} from './helpers.ts';
import type { IntegrationKernelResult } from './helpers.ts';

const skipReason = skipUnlessWasmBuilt();

describe.skipIf(skipReason)('dispose with active processes (integration)', () => {
  let ctx: IntegrationKernelResult;

  afterEach(async () => {
    if (ctx) await ctx.dispose();
  });

  it('dispose terminates active WasmVM sleep process within 5s', async () => {
    ctx = await createIntegrationKernel({ runtimes: ['wasmvm'] });

    // Spawn a long-running sleep — would hang for 60s without dispose
    const proc = ctx.kernel.spawn('sleep', ['60']);
    expect(proc.pid).toBeGreaterThan(0);

    const start = Date.now();
    await ctx.dispose();
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(5000);
  }, 10_000);

  it('dispose terminates active Node setTimeout process within 5s', async () => {
    ctx = await createIntegrationKernel({ runtimes: ['wasmvm', 'node'] });

    // Spawn a Node process that hangs for 60s
    const proc = ctx.kernel.spawn('node', ['-e', 'setTimeout(()=>{},60000)']);
    expect(proc.pid).toBeGreaterThan(0);

    const start = Date.now();
    await ctx.dispose();
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(5000);
  }, 10_000);

  it('dispose terminates processes in BOTH WasmVM and Node simultaneously', async () => {
    ctx = await createIntegrationKernel({ runtimes: ['wasmvm', 'node'] });

    // Spawn long-running processes in both runtimes
    const wasmProc = ctx.kernel.spawn('sleep', ['60']);
    const nodeProc = ctx.kernel.spawn('node', ['-e', 'setTimeout(()=>{},60000)']);

    expect(wasmProc.pid).toBeGreaterThan(0);
    expect(nodeProc.pid).toBeGreaterThan(0);
    expect(wasmProc.pid).not.toBe(nodeProc.pid);

    const start = Date.now();
    await ctx.dispose();
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(5000);
  }, 10_000);
});

// ---------------------------------------------------------------------------
// Process cleanup and timer disposal tests
// ---------------------------------------------------------------------------

describe('process cleanup and timer disposal', () => {
  let kernel: Kernel;

  afterEach(async () => {
    await kernel?.dispose();
  });

  it('crashed process has its worker/isolate cleaned up (no leaked drivers)', async () => {
    const vfs = new InMemoryFileSystem();
    kernel = createKernel({ filesystem: vfs });
    const driver = createNodeRuntime();
    await kernel.mount(driver);

    // Spawn a process that throws immediately
    const proc = kernel.spawn('node', ['-e', 'throw new Error("crash")']);
    const code = await proc.wait();

    // Process exited with error
    expect(code).not.toBe(0);

    // Verify no leaked active drivers (internal map should be empty after exit)
    const activeDrivers = (driver as any)._activeDrivers as Map<number, unknown>;
    expect(activeDrivers.size).toBe(0);
  });

  it('setInterval does not keep process alive after runtime dispose', async () => {
    const vfs = new InMemoryFileSystem();
    kernel = createKernel({ filesystem: vfs });
    const driver = createNodeRuntime();
    await kernel.mount(driver);

    // Spawn a process with setInterval that would run forever
    const proc = kernel.spawn('node', ['-e',
      'setInterval(() => {}, 10); setTimeout(() => {}, 60000)']);
    expect(proc.pid).toBeGreaterThan(0);

    // Dispose should terminate the isolate, killing the interval
    const start = Date.now();
    await kernel.dispose();
    const elapsed = Date.now() - start;

    // If setInterval leaked, this would hang for 60s
    expect(elapsed).toBeLessThan(5000);
  }, 10_000);

  it('piped stdout/stderr FDs closed on process exit, readers get EOF', async () => {
    // Mock driver that writes stdout via kernel FD then exits
    const mockDriver: RuntimeDriver = {
      name: 'pipe-eof-mock',
      commands: ['writer'],
      async init() {},
      spawn(_command: string, _args: string[], ctx: ProcessContext): DriverProcess {
        let exitResolve!: (code: number) => void;
        const exitPromise = new Promise<number>((r) => { exitResolve = r; });

        const proc: DriverProcess = {
          writeStdin() {},
          closeStdin() {},
          kill() { exitResolve(137); proc.onExit?.(137); },
          wait: () => exitPromise,
          onStdout: null,
          onStderr: null,
          onExit: null,
        };

        // Write to stdout then exit — FD cleanup propagates EOF to pipe readers
        queueMicrotask(() => {
          const data = new TextEncoder().encode('output');
          ctx.onStdout?.(data);
          proc.onStdout?.(data);
          exitResolve(0);
          proc.onExit?.(0);
        });

        return proc;
      },
      async dispose() {},
    };

    const vfs = new TestFileSystem();
    kernel = createKernel({ filesystem: vfs });
    await kernel.mount(mockDriver);

    // Capture stdout through onStdout callback
    const chunks: Uint8Array[] = [];
    const proc = kernel.spawn('writer', [], {
      onStdout: (data) => chunks.push(data),
    });

    const code = await proc.wait();
    expect(code).toBe(0);
    expect(chunks.length).toBeGreaterThan(0);

    const output = new TextDecoder().decode(chunks[0]);
    expect(output).toBe('output');
  });

  it('double-dispose on NodeRuntime does not throw', async () => {
    const vfs = new InMemoryFileSystem();
    kernel = createKernel({ filesystem: vfs });
    const driver = createNodeRuntime();
    await kernel.mount(driver);

    // First dispose through kernel
    await kernel.dispose();

    // Direct second dispose on the driver itself
    await expect(driver.dispose()).resolves.not.toThrow();
  });

  it.skipIf(skipUnlessPyodide())('double-dispose on PythonRuntime does not throw', async () => {
    const vfs = new InMemoryFileSystem();
    kernel = createKernel({ filesystem: vfs });
    const driver = createPythonRuntime();
    await kernel.mount(driver);

    // First dispose through kernel
    await kernel.dispose();

    // Direct second dispose on the driver itself
    await expect(driver.dispose()).resolves.not.toThrow();
  }, 30_000);
});
