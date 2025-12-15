import { init, Wasmer } from "@wasmer/sdk/node";

async function readAllFromStream(stream) {
  const reader = stream.getReader();
  const chunks = [];
  while (true) {
    const { done, value } = await Promise.race([
      reader.read(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 5000))
    ]);
    if (done) break;
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks.map(c => Buffer.from(c))));
}

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

  // Close stdin
  if (instance.stdin) {
    const writer = instance.stdin.getWriter();
    await writer.close();
    console.log("stdin closed");
  }

  // Try to read stdout with timeout
  console.log("reading stdout...");
  try {
    const stdout = await readAllFromStream(instance.stdout);
    console.log("stdout:", stdout);
  } catch (e) {
    console.log("stdout read error:", e.message);
  }

  console.log("reading stderr...");
  try {
    const stderr = await readAllFromStream(instance.stderr);
    console.log("stderr:", stderr);
  } catch (e) {
    console.log("stderr read error:", e.message);
  }
}

main().catch(console.error);
