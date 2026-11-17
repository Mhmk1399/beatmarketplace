import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";

// Compile the production module in memory; no generated files, runtime dependencies or alias loader.
export function loadTypeScript(fileUrl, mocks = {}) {
  const source = readFileSync(fileUrl, "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true } });
  const ordinaryRequire = createRequire(fileUrl);
  const mockedRequire = (specifier) => Object.hasOwn(mocks, specifier) ? mocks[specifier] : ordinaryRequire(specifier);
  const loadedModule = { exports: {} };
  const execute = new Function("require", "exports", "module", compiled.outputText);
  execute(mockedRequire, loadedModule.exports, loadedModule);
  return loadedModule.exports;
}
