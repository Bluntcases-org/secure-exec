import { init, Wasmer } from "@wasmer/sdk/node";

async function main() {
  console.log("initializing wasmer...");
  await init();
  console.log("wasmer initialized");

  console.log("loading python...");
  const pkg = await Wasmer.fromRegistry("python/python");
  console.log("loaded python package");

  const instance = await pkg.entrypoint.run({
    args: ["-c", "print('Hello, World!')"],
  });

  console.log("instance running, waiting...");
  const { code, stdout } = await instance.wait();
  console.log(`Python exited with ${code}: ${stdout}`);
}

main().catch(console.error);
