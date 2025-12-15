// Using /node variant
import { init, Wasmer } from "@wasmer/sdk/node";

async function main() {
  console.log("initializing wasmer...");
  await init();
  console.log("wasmer initialized");

  // run a simple command from wasmer registry
  const pkg = await Wasmer.fromRegistry("sharrattj/coreutils");
  console.log("loaded coreutils package");

  const instance = await pkg.commands["echo"].run({
    args: ["hello", "from", "wasmer"]
  });

  const output = await instance.wait();
  console.log("exit code:", output.code);
  console.log("stdout:", output.stdout);
  console.log("stderr:", output.stderr);
}

main().catch(console.error);
