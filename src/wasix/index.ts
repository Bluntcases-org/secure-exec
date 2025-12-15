import { init, Wasmer, Directory } from "@wasmer/sdk/node";
import * as fs from "fs/promises";
import * as path from "path";
import { fileURLToPath } from "url";

export interface ExecResult {
  stdout: string;
  stderr: string;
  code: number;
}

export interface WasixInstanceOptions {
  directory?: Directory;
}

let wasmerInitialized = false;
let nodeShimPkg: Awaited<ReturnType<typeof Wasmer.fromFile>> | null = null;

export class WasixInstance {
  private directory: Directory;
  private initialized = false;

  constructor(options: WasixInstanceOptions = {}) {
    this.directory = options.directory ?? new Directory();
  }

  /**
   * Initialize the WASIX instance
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    if (!wasmerInitialized) {
      await init();
      wasmerInitialized = true;
    }

    // Load the node-shim package if not already loaded
    if (!nodeShimPkg) {
      const currentDir = path.dirname(fileURLToPath(import.meta.url));
      const webcPath = path.resolve(currentDir, "../../assets/node-shim.webc");
      try {
        const webcBytes = await fs.readFile(webcPath);
        nodeShimPkg = await Wasmer.fromFile(webcBytes);
      } catch (err) {
        // If webc not found, try to get coreutils from registry
        // This fallback doesn't have node shim but provides basic shell
        console.warn(
          "Warning: node-shim.webc not found, falling back to registry coreutils"
        );
        nodeShimPkg = await Wasmer.fromRegistry("sharrattj/coreutils");
      }
    }

    this.initialized = true;
  }

  /**
   * Get the underlying Directory instance
   */
  getDirectory(): Directory {
    return this.directory;
  }

  /**
   * Execute a shell command string
   * @param commandString - Shell command to execute (e.g., "echo hello")
   */
  async exec(commandString: string): Promise<ExecResult> {
    await this.init();

    if (!nodeShimPkg) {
      throw new Error("WASIX not properly initialized");
    }

    // Use bash -c to execute the command string
    const bashCmd = nodeShimPkg.commands["bash"];
    if (!bashCmd) {
      // Fallback to sh if bash isn't available
      const shCmd = nodeShimPkg.commands["sh"];
      if (!shCmd) {
        throw new Error("No shell command (bash or sh) available");
      }
      return this.runCommand(shCmd, ["-c", commandString]);
    }

    return this.runCommand(bashCmd, ["-c", commandString]);
  }

  /**
   * Run a specific command with arguments
   * @param commandName - Name of the command (e.g., "ls", "cat")
   * @param args - Arguments for the command
   */
  async run(commandName: string, args: string[] = []): Promise<ExecResult> {
    await this.init();

    if (!nodeShimPkg) {
      throw new Error("WASIX not properly initialized");
    }

    const cmd = nodeShimPkg.commands[commandName];
    if (!cmd) {
      // Try to run via bash
      const bashCmd = nodeShimPkg.commands["bash"];
      if (bashCmd) {
        const fullCmd = [commandName, ...args].join(" ");
        return this.runCommand(bashCmd, ["-c", fullCmd]);
      }
      throw new Error(`Command not found: ${commandName}`);
    }

    return this.runCommand(cmd, args);
  }

  /**
   * Internal method to run a command
   */
  private async runCommand(
    cmd: ReturnType<typeof nodeShimPkg.commands[string]>,
    args: string[]
  ): Promise<ExecResult> {
    try {
      const instance = await cmd.run({
        args,
        mount: { "/": this.directory },
      });

      const result = await Promise.race([
        instance.wait(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Command timeout (10s)")), 10000)
        ),
      ]);

      return {
        stdout: result.stdout || "",
        stderr: result.stderr || "",
        code: result.code ?? 0,
      };
    } catch (err) {
      return {
        stdout: "",
        stderr: err instanceof Error ? err.message : String(err),
        code: 1,
      };
    }
  }
}
