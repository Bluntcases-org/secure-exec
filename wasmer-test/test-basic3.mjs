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
  console.log("instance type:", typeof instance);
  console.log("instance keys:", Object.keys(instance));
  console.log("instance.stdin:", instance.stdin);
  console.log("instance.stdout:", instance.stdout);
  console.log("instance.stderr:", instance.stderr);

  // Try reading stdout directly instead of wait()
  if (instance.stdout) {
    const reader = instance.stdout.getReader();
    const decoder = new TextDecoder();
    let output = "";
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        output += decoder.decode(value, { stream: true });
      }
      console.log("stdout content:", output);
    } catch (e) {
      console.log("stdout read error:", e.message);
    }
  }
}

main().catch(console.error);
