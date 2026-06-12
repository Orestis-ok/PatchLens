// tests/dependencyMapper.test.ts

import { describe, it, expect } from "vitest";
import { extractImports, parseDiffChunks } from "../src/analyzer/dependencyMapper.js";

describe("extractImports", () => {
  it("extracts ES module static imports", () => {
    const code = `
      import { foo } from './utils/foo';
      import bar from '../bar';
    `;
    const imports = extractImports(code);
    expect(imports).toContain("./utils/foo");
    expect(imports).toContain("../bar");
  });

  it("extracts CommonJS require calls", () => {
    const code = `const fs = require('fs'); const foo = require('./foo');`;
    const imports = extractImports(code);
    expect(imports).toContain("fs");
    expect(imports).toContain("./foo");
  });

  it("extracts dynamic imports", () => {
    const code = `const mod = await import('./heavy-module');`;
    const imports = extractImports(code);
    expect(imports).toContain("./heavy-module");
  });

  it("deduplicates imports", () => {
    const code = `
      import a from './shared';
      import b from './shared';
    `;
    const imports = extractImports(code);
    expect(imports.filter((i) => i === "./shared")).toHaveLength(1);
  });

  it("returns empty array for code with no imports", () => {
    const code = `const x = 1 + 1; console.log(x);`;
    expect(extractImports(code)).toHaveLength(0);
  });
});

describe("parseDiffChunks", () => {
  it("extracts added lines from a git diff", () => {
    const diff = `diff --git a/src/foo.ts b/src/foo.ts
index abc..def 100644
--- a/src/foo.ts
+++ b/src/foo.ts
@@ -1,3 +1,4 @@
 const x = 1;
+import { bar } from './bar';
 export default x;
`;
    const chunks = parseDiffChunks(diff);
    expect(chunks.length).toBe(1);
    expect(chunks[0].filePath).toBe("src/foo.ts");
    expect(chunks[0].addedLines).toContain("import { bar } from './bar'");
  });
});