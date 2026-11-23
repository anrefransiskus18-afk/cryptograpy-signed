import { existsSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve as pathResolve } from "node:path";
import ts from "typescript";

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith(".") && context.parentURL) {
    const parentDir = dirname(fileURLToPath(context.parentURL));
    const candidate = pathResolve(parentDir, specifier);
    const tsMapped = candidate.endsWith(".js") ? candidate.replace(/\.js$/, ".ts") : null;
    const tryFiles = [
      candidate,
      ...(tsMapped ? [tsMapped] : []),
      `${candidate}.ts`,
      `${candidate}.js`,
      `${candidate}/index.ts`,
      `${candidate}/index.js`
    ];
    for (const filePath of tryFiles) {
      if (existsSync(filePath) && statSync(filePath).isFile()) {
        return nextResolve(pathToFileURL(filePath).href, context);
      }
    }
  }
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.endsWith(".ts")) {
    const source = readFileSync(fileURLToPath(url), "utf-8");
    const { outputText } = ts.transpileModule(source, {
      fileName: fileURLToPath(url),
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true
      }
    });
    return {
      format: "module",
      source: outputText,
      shortCircuit: true
    };
  }
  return nextLoad(url, context);
}
