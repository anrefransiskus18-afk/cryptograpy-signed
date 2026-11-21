import { existsSync, statSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve as pathResolve } from "node:path";

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith(".") && context.parentURL) {
    const parentDir = dirname(fileURLToPath(context.parentURL));
    const candidate = pathResolve(parentDir, specifier);
    if (!existsSync(candidate) && existsSync(`${candidate}.js`)) {
      return nextResolve(`${pathToFileURL(`${candidate}.js`).href}`, context);
    }
    if (existsSync(candidate) && statSync(candidate).isDirectory() && existsSync(`${candidate}/index.js`)) {
      return nextResolve(`${pathToFileURL(`${candidate}/index.js`).href}`, context);
    }
  }
  return nextResolve(specifier, context);
}
