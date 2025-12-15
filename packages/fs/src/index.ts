import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Get the fs module code that can be injected into an isolate.
 * This returns the compiled JavaScript code as a string wrapped in an IIFE.
 */
export function getFsModuleCode(): string {
  // Read the compiled fs-module.global.js file (IIFE format)
  const fsModulePath = path.join(__dirname, "fs-module.global.js");
  const code = fs.readFileSync(fsModulePath, "utf8");

  // The compiled code creates a global `fsModule` variable with the module exports
  // The IIFE returns { default: fs, __esModule: true }
  // We need to wrap it to return the default export

  return `(function() {
${code}
  return fsModule.default;
})()`;
}

/**
 * The fs module code as a constant string.
 * Use this if you need the code at import time.
 */
export const FS_MODULE_CODE = getFsModuleCode();

export default FS_MODULE_CODE;
