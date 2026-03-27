/**
 * E2E test: Pi interactive PTY through the sandbox with real provider traffic.
 *
 * Uses kernel.openShell() + TerminalHarness, real Anthropic credentials loaded
 * at runtime, host-backed filesystem access for the mutable temp worktree, and
 * host network for provider requests.
 */

import { existsSync } from 'node:fs';
import * as fsPromises from 'node:fs/promises';
import { chmod, copyFile, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import {
  allowAllChildProcess,
  allowAllEnv,
  allowAllFs,
  allowAllNetwork,
  createKernel,
  type VirtualFileSystem,
} from '../../../core/src/index.ts';
import type { Kernel } from '../../../core/src/index.ts';
import { TerminalHarness } from '../../../core/test/kernel/terminal-harness.ts';
import {
  createNodeHostNetworkAdapter,
  createNodeRuntime,
} from '../../../nodejs/src/index.ts';
import { createWasmVmRuntime } from '../../../wasmvm/src/index.ts';
import { InMemoryFileSystem } from '../../../browser/src/os-filesystem.ts';
import { loadRealProviderEnv } from './real-provider-env.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = path.resolve(__dirname, '../../../..');
const SECURE_EXEC_ROOT = path.resolve(__dirname, '../..');
const WASM_COMMANDS_DIR = path.resolve(
  SECURE_EXEC_ROOT,
  '../../native/wasmvm/target/wasm32-wasip1/release/commands',
);
const REAL_PROVIDER_FLAG = 'SECURE_EXEC_PI_REAL_PROVIDER_E2E';
const PI_TOOLS_MANAGER = path.resolve(
  SECURE_EXEC_ROOT,
  'node_modules/@mariozechner/pi-coding-agent/dist/utils/tools-manager.js',
);
const PI_TOOL_CACHE_DIR = path.join(tmpdir(), 'secure-exec-pi-tool-cache');

function skipUnlessPiInstalled(): string | false {
  const cliPath = path.resolve(
    SECURE_EXEC_ROOT,
    'node_modules/@mariozechner/pi-coding-agent/dist/cli.js',
  );
  return existsSync(cliPath)
    ? false
    : '@mariozechner/pi-coding-agent not installed';
}

const PI_CLI = path.resolve(
  SECURE_EXEC_ROOT,
  'node_modules/@mariozechner/pi-coding-agent/dist/cli.js',
);

const PI_BASE_FLAGS = [
  '--verbose',
  '--no-session',
  '--no-extensions',
  '--no-skills',
  '--no-prompt-templates',
  '--no-themes',
];

function getSkipReason(): string | false {
  const piSkip = skipUnlessPiInstalled();
  if (piSkip) return piSkip;

  if (!existsSync(path.join(WASM_COMMANDS_DIR, 'tar'))) {
    return 'WasmVM tar command not built (expected native/wasmvm/.../commands/tar)';
  }

  if (process.env[REAL_PROVIDER_FLAG] !== '1') {
    return `${REAL_PROVIDER_FLAG}=1 required for real provider PTY E2E`;
  }

  return loadRealProviderEnv(['ANTHROPIC_API_KEY']).skipReason ?? false;
}

function buildPiInteractiveCode(opts: { workDir: string }): string {
  const flags = [
    ...PI_BASE_FLAGS,
    '--provider',
    'anthropic',
    '--model',
    'claude-sonnet-4-20250514',
  ];

  return `(async () => {
    try {
      process.chdir(${JSON.stringify(opts.workDir)});
      process.argv = ['node', 'pi', ${flags.map((flag) => JSON.stringify(flag)).join(', ')}];
      process.env.HOME = ${JSON.stringify(opts.workDir)};
      process.env.NO_COLOR = '1';
      process.env.PATH = ${JSON.stringify(path.join(opts.workDir, '.pi/agent/bin'))} + ':/usr/bin:/bin';
      await import(${JSON.stringify(PI_CLI)});
    } catch (error) {
      console.error(error && error.stack ? error.stack : String(error));
      process.exitCode = 1;
    }
  })()`;
}

async function seedPiManagedTools(workDir: string): Promise<string> {
  const helperBinDir = path.join(workDir, '.pi/agent/bin');
  await mkdir(helperBinDir, { recursive: true });

  const previousAgentDir = process.env.PI_CODING_AGENT_DIR;
  const previousHome = process.env.HOME;
  const previousPath = process.env.PATH;

  try {
    process.env.PI_CODING_AGENT_DIR = path.join(PI_TOOL_CACHE_DIR, 'agent');
    process.env.HOME = PI_TOOL_CACHE_DIR;
    process.env.PATH = '/usr/bin:/bin';

    const { ensureTool } = await import(PI_TOOLS_MANAGER) as {
      ensureTool: (tool: 'fd' | 'rg', silent?: boolean) => Promise<string | undefined>;
    };

    const fdPath = await ensureTool('fd', true);
    const rgPath = await ensureTool('rg', true);
    if (!fdPath || !rgPath) {
      throw new Error('Failed to provision Pi managed fd/rg binaries');
    }

    await copyFile(fdPath, path.join(helperBinDir, 'fd'));
    await copyFile(rgPath, path.join(helperBinDir, 'rg'));
    await chmod(path.join(helperBinDir, 'fd'), 0o755);
    await chmod(path.join(helperBinDir, 'rg'), 0o755);
    return helperBinDir;
  } finally {
    if (previousAgentDir === undefined) delete process.env.PI_CODING_AGENT_DIR;
    else process.env.PI_CODING_AGENT_DIR = previousAgentDir;
    if (previousHome === undefined) delete process.env.HOME;
    else process.env.HOME = previousHome;
    if (previousPath === undefined) delete process.env.PATH;
    else process.env.PATH = previousPath;
  }
}

function createHybridVfs(workDir: string): VirtualFileSystem {
  const memfs = new InMemoryFileSystem();
  const hostRoots = [WORKSPACE_ROOT, SECURE_EXEC_ROOT, workDir, '/tmp'];

  const isHostPath = (targetPath: string): boolean =>
    hostRoots.some((root) => targetPath === root || targetPath.startsWith(`${root}/`));

  return {
    readFile: async (targetPath) => {
      try { return await memfs.readFile(targetPath); }
      catch { return new Uint8Array(await fsPromises.readFile(targetPath)); }
    },
    readTextFile: async (targetPath) => {
      try { return await memfs.readTextFile(targetPath); }
      catch { return await fsPromises.readFile(targetPath, 'utf-8'); }
    },
    readDir: async (targetPath) => {
      try { return await memfs.readDir(targetPath); }
      catch { return await fsPromises.readdir(targetPath); }
    },
    readDirWithTypes: async (targetPath) => {
      try { return await memfs.readDirWithTypes(targetPath); }
      catch {
        const entries = await fsPromises.readdir(targetPath, { withFileTypes: true });
        return entries.map((entry) => ({
          name: entry.name,
          isDirectory: entry.isDirectory(),
        }));
      }
    },
    exists: async (targetPath) => {
      if (await memfs.exists(targetPath)) return true;
      try {
        await fsPromises.access(targetPath);
        return true;
      } catch {
        return false;
      }
    },
    stat: async (targetPath) => {
      try { return await memfs.stat(targetPath); }
      catch {
        const info = await fsPromises.stat(targetPath);
        return {
          mode: info.mode,
          size: info.size,
          isDirectory: info.isDirectory(),
          isSymbolicLink: false,
          atimeMs: info.atimeMs,
          mtimeMs: info.mtimeMs,
          ctimeMs: info.ctimeMs,
          birthtimeMs: info.birthtimeMs,
          ino: info.ino,
          nlink: info.nlink,
          uid: info.uid,
          gid: info.gid,
        };
      }
    },
    lstat: async (targetPath) => {
      try { return await memfs.lstat(targetPath); }
      catch {
        const info = await fsPromises.lstat(targetPath);
        return {
          mode: info.mode,
          size: info.size,
          isDirectory: info.isDirectory(),
          isSymbolicLink: info.isSymbolicLink(),
          atimeMs: info.atimeMs,
          mtimeMs: info.mtimeMs,
          ctimeMs: info.ctimeMs,
          birthtimeMs: info.birthtimeMs,
          ino: info.ino,
          nlink: info.nlink,
          uid: info.uid,
          gid: info.gid,
        };
      }
    },
    realpath: async (targetPath) => {
      try { return await memfs.realpath(targetPath); }
      catch { return await fsPromises.realpath(targetPath); }
    },
    readlink: async (targetPath) => {
      try { return await memfs.readlink(targetPath); }
      catch { return await fsPromises.readlink(targetPath); }
    },
    pread: async (targetPath, offset, length) => {
      try { return await memfs.pread(targetPath, offset, length); }
      catch {
        const fd = await fsPromises.open(targetPath, 'r');
        try {
          const buf = Buffer.alloc(length);
          const { bytesRead } = await fd.read(buf, 0, length, offset);
          return new Uint8Array(buf.buffer, buf.byteOffset, bytesRead);
        } finally {
          await fd.close();
        }
      }
    },
    writeFile: (targetPath, content) =>
      isHostPath(targetPath)
        ? fsPromises.writeFile(targetPath, content)
        : memfs.writeFile(targetPath, content),
    createDir: (targetPath) =>
      isHostPath(targetPath)
        ? fsPromises.mkdir(targetPath)
        : memfs.createDir(targetPath),
    mkdir: (targetPath, options) =>
      isHostPath(targetPath)
        ? fsPromises.mkdir(targetPath, { recursive: options?.recursive ?? true })
        : memfs.mkdir(targetPath, options),
    removeFile: (targetPath) =>
      isHostPath(targetPath)
        ? fsPromises.unlink(targetPath)
        : memfs.removeFile(targetPath),
    removeDir: (targetPath) =>
      isHostPath(targetPath)
        ? fsPromises.rm(targetPath, { recursive: true, force: false })
        : memfs.removeDir(targetPath),
    rename: (oldPath, newPath) =>
      (isHostPath(oldPath) || isHostPath(newPath))
        ? fsPromises.rename(oldPath, newPath)
        : memfs.rename(oldPath, newPath),
    symlink: (target, linkPath) =>
      isHostPath(linkPath)
        ? fsPromises.symlink(target, linkPath)
        : memfs.symlink(target, linkPath),
    link: (oldPath, newPath) =>
      (isHostPath(oldPath) || isHostPath(newPath))
        ? fsPromises.link(oldPath, newPath)
        : memfs.link(oldPath, newPath),
    chmod: (targetPath, mode) =>
      isHostPath(targetPath)
        ? fsPromises.chmod(targetPath, mode)
        : memfs.chmod(targetPath, mode),
    chown: (targetPath, uid, gid) =>
      isHostPath(targetPath)
        ? fsPromises.chown(targetPath, uid, gid)
        : memfs.chown(targetPath, uid, gid),
    utimes: (targetPath, atime, mtime) =>
      isHostPath(targetPath)
        ? fsPromises.utimes(targetPath, atime, mtime)
        : memfs.utimes(targetPath, atime, mtime),
    truncate: (targetPath, length) =>
      isHostPath(targetPath)
        ? fsPromises.truncate(targetPath, length)
        : memfs.truncate(targetPath, length),
  };
}

const skipReason = getSkipReason();

describe.skipIf(skipReason)('Pi PTY real-provider E2E (sandbox)', () => {
  let kernel: Kernel | undefined;
  let harness: TerminalHarness | undefined;
  let workDir: string | undefined;
  let tarRuntimeDir: string | undefined;

  afterEach(async () => {
    await harness?.dispose();
    harness = undefined;
    await kernel?.dispose();
    kernel = undefined;
    if (workDir) {
      await rm(workDir, { recursive: true, force: true });
      workDir = undefined;
    }
    if (tarRuntimeDir) {
      await rm(tarRuntimeDir, { recursive: true, force: true });
      tarRuntimeDir = undefined;
    }
  });

  it(
    'renders Pi in a sandbox PTY and answers from a real provider using the note canary',
    async () => {
      const providerEnv = loadRealProviderEnv(['ANTHROPIC_API_KEY']);
      expect(providerEnv.skipReason).toBeUndefined();

      workDir = await mkdtemp(path.join(tmpdir(), 'pi-pty-real-provider-'));
      tarRuntimeDir = await mkdtemp(path.join(tmpdir(), 'pi-pty-tar-runtime-'));
      const canary = `PI_PTY_REAL_PROVIDER_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      await writeFile(path.join(workDir, 'note.txt'), canary);
      const helperBinDir = await seedPiManagedTools(workDir);
      await copyFile(path.join(WASM_COMMANDS_DIR, 'tar'), path.join(tarRuntimeDir, 'tar'));
      await chmod(path.join(tarRuntimeDir, 'tar'), 0o755);

      const permissions = {
        ...allowAllFs,
        ...allowAllNetwork,
        ...allowAllChildProcess,
        ...allowAllEnv,
      };

      kernel = createKernel({
        filesystem: createHybridVfs(workDir),
        hostNetworkAdapter: createNodeHostNetworkAdapter(),
        permissions,
      });
      await kernel.mount(
        createNodeRuntime({
          permissions,
        }),
      );
      await kernel.mount(createWasmVmRuntime({ commandDirs: [tarRuntimeDir] }));

      harness = new TerminalHarness(kernel, {
        command: 'node',
        args: ['-e', buildPiInteractiveCode({ workDir })],
        cwd: SECURE_EXEC_ROOT,
        env: {
          ...providerEnv.env!,
          HOME: workDir,
          NO_COLOR: '1',
          PATH: `${helperBinDir}:${process.env.PATH ?? '/usr/bin:/bin'}`,
        },
      });
      const rawOutput: string[] = [];
      const originalOnData = harness.shell.onData;
      harness.shell.onData = (data: Uint8Array) => {
        rawOutput.push(new TextDecoder().decode(data));
        originalOnData?.(data);
      };

      try {
        await harness.waitFor('claude-sonnet', 1, 60_000);
        await harness.waitFor('drop files to attach', 1, 15_000);
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`${message}\nRaw PTY:\n${rawOutput.join('')}`);
      }
      await harness.type(`Read ${path.join(workDir, 'note.txt')} and answer with the exact file contents only.`);
      harness.shell.write('\r');
      await new Promise((resolve) => setTimeout(resolve, 200));
      await harness.waitFor(canary, 1, 90_000);

      expect(harness.screenshotTrimmed()).toContain(canary);

      harness.shell.kill();
      const exitCode = await Promise.race([
        harness.shell.wait(),
        new Promise<number>((_, reject) =>
          setTimeout(() => reject(new Error('Pi did not terminate after success')), 20_000),
        ),
      ]);

      expect(exitCode).not.toBeNull();
    },
    120_000,
  );
});
