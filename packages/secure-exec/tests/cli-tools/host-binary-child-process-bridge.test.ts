import { spawn as nodeSpawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import * as fsPromises from 'node:fs/promises';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import {
  allowAllChildProcess,
  allowAllEnv,
  createKernel,
} from '../../../core/src/kernel/index.ts';
import type {
  DriverProcess,
  Kernel,
  KernelInterface,
  ProcessContext,
  RuntimeDriver,
} from '../../../core/src/kernel/index.ts';
import type { VirtualFileSystem } from '../../../core/src/kernel/vfs.ts';
import { createInMemoryFileSystem } from '../../../core/src/shared/in-memory-fs.ts';
import { createNodeRuntime } from '../../../nodejs/src/kernel-runtime.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = path.resolve(__dirname, '../..');
const HOST_BINARY_NAME = 'tsc';
const HOST_BINARY_BIN = path.join(PACKAGE_ROOT, 'node_modules/.bin/tsc');

class HostBinaryDriver implements RuntimeDriver {
  readonly name = 'host-binary';
  readonly commands: string[];

  constructor(commands: string[]) {
    this.commands = commands;
  }

  async init(_kernel: KernelInterface): Promise<void> {}

  spawn(command: string, args: string[], ctx: ProcessContext): DriverProcess {
    const child = nodeSpawn(command, args, {
      cwd: ctx.cwd,
      env: ctx.env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let resolveExit!: (code: number) => void;
    let exitResolved = false;
    const exitPromise = new Promise<number>((resolve) => {
      resolveExit = (code: number) => {
        if (exitResolved) return;
        exitResolved = true;
        resolve(code);
      };
    });

    const proc: DriverProcess = {
      onStdout: null,
      onStderr: null,
      onExit: null,
      writeStdin: (data) => {
        try {
          child.stdin.write(data);
        } catch {
          // stdin may already be closed
        }
      },
      closeStdin: () => {
        try {
          child.stdin.end();
        } catch {
          // stdin may already be closed
        }
      },
      kill: (signal) => {
        try {
          child.kill(signal);
        } catch {
          // process may already be dead
        }
      },
      wait: () => exitPromise,
    };

    child.on('error', (error) => {
      const message = `${command}: ${error.message}\n`;
      const bytes = new TextEncoder().encode(message);
      ctx.onStderr?.(bytes);
      proc.onStderr?.(bytes);
      resolveExit(127);
      proc.onExit?.(127);
    });

    child.stdout.on('data', (data: Buffer) => {
      const bytes = new Uint8Array(data);
      ctx.onStdout?.(bytes);
      proc.onStdout?.(bytes);
    });

    child.stderr.on('data', (data: Buffer) => {
      const bytes = new Uint8Array(data);
      ctx.onStderr?.(bytes);
      proc.onStderr?.(bytes);
    });

    child.on('close', (code) => {
      const exitCode = code ?? 1;
      resolveExit(exitCode);
      proc.onExit?.(exitCode);
    });

    return proc;
  }

  async dispose(): Promise<void> {}
}

function createOverlayVfs(): VirtualFileSystem {
  const memfs = createInMemoryFileSystem();
  return {
    readFile: async (filePath) => {
      try {
        return await memfs.readFile(filePath);
      } catch {
        return new Uint8Array(await fsPromises.readFile(filePath));
      }
    },
    readTextFile: async (filePath) => {
      try {
        return await memfs.readTextFile(filePath);
      } catch {
        return await fsPromises.readFile(filePath, 'utf8');
      }
    },
    readDir: async (filePath) => {
      try {
        return await memfs.readDir(filePath);
      } catch {
        return await fsPromises.readdir(filePath);
      }
    },
    readDirWithTypes: async (filePath) => {
      try {
        return await memfs.readDirWithTypes(filePath);
      } catch {
        const entries = await fsPromises.readdir(filePath, { withFileTypes: true });
        return entries.map((entry) => ({
          name: entry.name,
          isDirectory: entry.isDirectory(),
        }));
      }
    },
    exists: async (filePath) => {
      if (await memfs.exists(filePath)) return true;
      try {
        await fsPromises.access(filePath);
        return true;
      } catch {
        return false;
      }
    },
    stat: async (filePath) => {
      try {
        return await memfs.stat(filePath);
      } catch {
        const stat = await fsPromises.stat(filePath);
        return {
          mode: stat.mode,
          size: stat.size,
          isDirectory: stat.isDirectory(),
          isSymbolicLink: false,
          atimeMs: stat.atimeMs,
          mtimeMs: stat.mtimeMs,
          ctimeMs: stat.ctimeMs,
          birthtimeMs: stat.birthtimeMs,
        };
      }
    },
    lstat: async (filePath) => {
      try {
        return await memfs.lstat(filePath);
      } catch {
        const stat = await fsPromises.lstat(filePath);
        return {
          mode: stat.mode,
          size: stat.size,
          isDirectory: stat.isDirectory(),
          isSymbolicLink: stat.isSymbolicLink(),
          atimeMs: stat.atimeMs,
          mtimeMs: stat.mtimeMs,
          ctimeMs: stat.ctimeMs,
          birthtimeMs: stat.birthtimeMs,
        };
      }
    },
    realpath: async (filePath) => {
      try {
        return await memfs.realpath(filePath);
      } catch {
        return await fsPromises.realpath(filePath);
      }
    },
    readlink: async (filePath) => {
      try {
        return await memfs.readlink(filePath);
      } catch {
        return await fsPromises.readlink(filePath);
      }
    },
    pread: async (filePath, offset, length) => {
      try {
        return await memfs.pread(filePath, offset, length);
      } catch {
        const fd = await fsPromises.open(filePath, 'r');
        try {
          const buffer = Buffer.alloc(length);
          const { bytesRead } = await fd.read(buffer, 0, length, offset);
          return new Uint8Array(buffer.buffer, buffer.byteOffset, bytesRead);
        } finally {
          await fd.close();
        }
      }
    },
    pwrite: async (filePath, offset, data) => {
      try {
        await memfs.pwrite(filePath, offset, data);
      } catch {
        const fd = await fsPromises.open(filePath, 'r+');
        try {
          await fd.write(data, 0, data.length, offset);
        } finally {
          await fd.close();
        }
      }
    },
    writeFile: (filePath, content) => memfs.writeFile(filePath, content),
    createDir: (filePath) => memfs.createDir(filePath),
    mkdir: (filePath, options) => memfs.mkdir(filePath, options),
    removeFile: (filePath) => memfs.removeFile(filePath),
    removeDir: (filePath) => memfs.removeDir(filePath),
    rename: (oldPath, newPath) => memfs.rename(oldPath, newPath),
    symlink: (target, filePath) => memfs.symlink(target, filePath),
    link: (oldPath, newPath) => memfs.link(oldPath, newPath),
    chmod: (filePath, mode) => memfs.chmod(filePath, mode),
    chown: (filePath, uid, gid) => memfs.chown(filePath, uid, gid),
    utimes: (filePath, atime, mtime) => memfs.utimes(filePath, atime, mtime),
    truncate: (filePath, length) => memfs.truncate(filePath, length),
  };
}

function skipUnlessHostBinaryInstalled(): string | false {
  if (!existsSync(HOST_BINARY_BIN)) {
    return `${HOST_BINARY_NAME} test dependency not installed`;
  }

  const probe = spawnSync(HOST_BINARY_BIN, ['--version'], { stdio: 'ignore' });
  return probe.status === 0
    ? false
    : `${HOST_BINARY_NAME} binary probe failed with status ${probe.status ?? 'unknown'}`;
}

async function createNodeKernel(): Promise<Kernel> {
  const kernel = createKernel({ filesystem: createOverlayVfs() });
  await kernel.mount(createNodeRuntime({
    permissions: { ...allowAllChildProcess, ...allowAllEnv },
  }));
  await kernel.mount(new HostBinaryDriver([HOST_BINARY_NAME]));
  return kernel;
}

async function runKernelCommand(
  kernel: Kernel,
  command: string,
  args: string[],
  options: {
    cwd: string;
    env: Record<string, string>;
    timeoutMs?: number;
  },
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const proc = kernel.spawn(command, args, {
    cwd: options.cwd,
    env: options.env,
    onStdout: (data) => stdout.push(new TextDecoder().decode(data)),
    onStderr: (data) => stderr.push(new TextDecoder().decode(data)),
  });

  const timeoutMs = options.timeoutMs ?? 10_000;
  const timeout = new Promise<number>((resolve) => {
    setTimeout(() => {
      try {
        proc.kill('SIGKILL');
      } catch {
        // process may already be closed
      }
      resolve(124);
    }, timeoutMs).unref();
  });

  const exitCode = await Promise.race([proc.wait(), timeout]);
  return {
    exitCode,
    stdout: stdout.join(''),
    stderr: stderr.join(''),
  };
}

const skipReason = skipUnlessHostBinaryInstalled();

describe.skipIf(skipReason)('Mounted host-binary child_process bridge regression', () => {
  let kernel: Kernel | undefined;
  let workDir: string | undefined;

  afterEach(async () => {
    await kernel?.dispose();
    kernel = undefined;

    if (workDir) {
      await rm(workDir, { recursive: true, force: true });
      workDir = undefined;
    }
  });

  it('delivers stdout and exit for mounted host-binary commands spawned from sandboxed Node', async () => {
    workDir = await mkdtemp(path.join(tmpdir(), 'opencode-child-process-bridge-'));
    kernel = await createNodeKernel();

    const sandboxEnv = {
      PATH: `${path.join(PACKAGE_ROOT, 'node_modules/.bin')}:${process.env.PATH ?? ''}`,
      HOME: workDir,
      NO_COLOR: '1',
    };

    const directHostBinary = await runKernelCommand(kernel, HOST_BINARY_NAME, ['--version'], {
      cwd: workDir,
      env: sandboxEnv,
    });
    expect(directHostBinary.exitCode, directHostBinary.stderr).toBe(0);
    expect(
      directHostBinary.stdout
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .some((line) => /\d+\.\d+\.\d+/.test(line)),
    ).toBe(true);

    const bridgeProbe = await runKernelCommand(
      kernel,
      'node',
      ['-e', [
        'const { spawn } = require("node:child_process");',
        `const child = spawn(${JSON.stringify(HOST_BINARY_NAME)}, ["--version"], { env: process.env });`,
        'child.stdout.on("data", (chunk) => process.stdout.write(String(chunk)));',
        'child.stderr.on("data", (chunk) => process.stderr.write(String(chunk)));',
        'child.on("error", (error) => process.stderr.write("ERR:" + error.message + "\\n"));',
        'child.on("close", (code) => process.stdout.write("EXIT:" + String(code) + "\\n"));',
      ].join('\n')],
      {
        cwd: workDir,
        env: sandboxEnv,
        timeoutMs: 10_000,
      },
    );

    expect(bridgeProbe.exitCode, bridgeProbe.stderr).toBe(0);
    expect(bridgeProbe.stderr).not.toContain('ERR:');
    expect(bridgeProbe.stdout).toContain('EXIT:0');
    expect(
      bridgeProbe.stdout
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .some((line) => /\d+\.\d+\.\d+/.test(line)),
    ).toBe(true);
  }, 15_000);
});
