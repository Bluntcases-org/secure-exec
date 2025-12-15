import { init, Wasmer } from "@wasmer/sdk/node";

async function main() {
  console.log("initializing wasmer...");
  await init();
  console.log("wasmer initialized");

  const pkg = await Wasmer.fromRegistry("sharrattj/coreutils");
  console.log("loaded coreutils package");

  console.log("running echo command...");
  const instance = await pkg.commands["echo"].run({
    args: ["hello", "from", "wasmer"]
  });
  console.log("instance created");

  // Close stdin to signal we're not sending any input
  if (instance.stdin) {
    const writer = instance.stdin.getWriter();
    await writer.close();
    console.log("stdin closed");
  }

  console.log("waiting for output...");
  const output = await instance.wait();
  console.log("exit code:", output.code);
  console.log("stdout:", output.stdout);
  console.log("stderr:", output.stderr);
}

main().catch(console.error);
