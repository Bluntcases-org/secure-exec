import { defineConfig } from "tsup";

export default defineConfig([
  // The fs module itself - compiled as IIFE for injection into isolate
  {
    entry: ["src/fs-module.ts"],
    format: ["iife"],
    globalName: "fsModule",
    outDir: "dist",
    clean: true,
    minify: false,
    // Don't bundle external dependencies - this runs in an isolate
    noExternal: [/.*/],
    // Don't generate dts for this one
    dts: false,
  },
  // Main entry - exports the fs module code as a string
  {
    entry: ["src/index.ts"],
    format: ["esm"],
    dts: true,
    outDir: "dist",
    // Don't bundle node builtins
    external: ["fs", "path", "url"],
  },
]);
