// tests/testFinder.test.ts

import { describe, it, expect } from "vitest";
import { findRelatedTests, findMissingTests } from "../src/analyzer/testFinder.js";
import type { ChangedFile } from "../src/types.js";

function makeFile(overrides: Partial<ChangedFile>): ChangedFile {
  return {
    path: "src/foo.ts",
    category: "source",
    additions: 10,
    deletions: 0,
    isNew: false,
    isDeleted: false,
    isRenamed: false,
    ...overrides,
  };
}

describe("findRelatedTests", () => {
  it("finds a test file that was also changed in the diff", () => {
    const files = [
      makeFile({ path: "src/utils/parser.ts", category: "source" }),
      makeFile({ path: "src/utils/parser.test.ts", category: "test" }),
    ];
    const related = findRelatedTests(files, files.map((f) => f.path));
    expect(related.length).toBeGreaterThan(0);
    expect(related[0].sourceFile).toBe("src/utils/parser.ts");
  });

  it("matches test files by name convention", () => {
    const files = [
      makeFile({ path: "src/auth/login.ts", category: "source" }),
      makeFile({ path: "src/auth/login.spec.ts", category: "test" }),
    ];
    const related = findRelatedTests(files, files.map((f) => f.path));
    expect(related.some((r) => r.sourceFile === "src/auth/login.ts")).toBe(true);
  });

  it("returns empty when no tests are in the diff", () => {
    const files = [
      makeFile({ path: "src/auth/login.ts", category: "source" }),
    ];
    const related = findRelatedTests(files, files.map((f) => f.path));
    expect(related).toHaveLength(0);
  });
});

describe("findMissingTests", () => {
  it("warns when a source file has no related test", () => {
    const files = [
      makeFile({ path: "src/payments/stripe.ts", category: "source" }),
    ];
    const missing = findMissingTests(files, []);
    expect(missing.length).toBe(1);
    expect(missing[0].sourceFile).toBe("src/payments/stripe.ts");
  });

  it("does not warn when a source file has a related test", () => {
    const files = [
      makeFile({ path: "src/payments/stripe.ts", category: "source" }),
    ];
    const related = [
      {
        testFile: "src/payments/stripe.test.ts",
        sourceFile: "src/payments/stripe.ts",
        confidence: 0.9,
        reason: "test found",
      },
    ];
    const missing = findMissingTests(files, related);
    expect(missing).toHaveLength(0);
  });

  it("does not warn for deleted source files", () => {
    const files = [
      makeFile({ path: "src/old.ts", category: "source", isDeleted: true }),
    ];
    const missing = findMissingTests(files, []);
    expect(missing).toHaveLength(0);
  });
});