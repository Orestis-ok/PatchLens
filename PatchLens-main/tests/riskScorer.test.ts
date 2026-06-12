// tests/riskScorer.test.ts

import { describe, it, expect } from "vitest";
import { scoreRisk } from "../src/analyzer/riskScorer.js";
import type { ChangedFile, DependencyEdge, MissingTestWarning } from "../src/types.js";

function makeFile(overrides: Partial<ChangedFile> = {}): ChangedFile {
  return {
    path: "src/foo.ts",
    category: "source",
    additions: 10,
    deletions: 5,
    isNew: false,
    isDeleted: false,
    isRenamed: false,
    ...overrides,
  };
}

describe("scoreRisk", () => {
  it("returns low risk for a small clean diff", () => {
    const files = [makeFile(), makeFile({ path: "src/bar.ts" })];
    const result = scoreRisk(files, [], []);
    expect(result.level).toBe("low");
    expect(result.score).toBeLessThan(25);
  });

  it("increases score for dependency file changes", () => {
    const files = [makeFile({ path: "package.json", category: "dependency" })];
    const result = scoreRisk(files, [], []);
    expect(result.score).toBeGreaterThanOrEqual(20);
  });

  it("increases score for schema changes", () => {
    const files = [makeFile({ path: "db/migrations/001.sql", category: "schema" })];
    const result = scoreRisk(files, [], []);
    expect(result.score).toBeGreaterThanOrEqual(25);
  });

  it("reaches critical for schema + deps + config + missing tests", () => {
    const files = [
      makeFile({ path: "package.json", category: "dependency" }),
      makeFile({ path: "tsconfig.json", category: "config" }),
      makeFile({ path: "db/migrations/001.sql", category: "schema" }),
      makeFile({ path: "src/routes/api.ts", category: "routes" }),
    ];
    const warnings: MissingTestWarning[] = [
      { sourceFile: "src/routes/api.ts", reason: "no test found" },
      { sourceFile: "src/routes/api.ts", reason: "no test found" },
      { sourceFile: "src/routes/api.ts", reason: "no test found" },
      { sourceFile: "src/routes/api.ts", reason: "no test found" },
    ];
    const result = scoreRisk(files, [], warnings);
    expect(result.score).toBeGreaterThanOrEqual(75);
    expect(result.level).toBe("critical");
  });

  it("includes relevant factors in the output", () => {
    const files = [
      makeFile({ path: "package.json", category: "dependency" }),
    ];
    const result = scoreRisk(files, [], []);
    const descriptions = result.factors.map((f) => f.description);
    expect(descriptions.some((d) => d.includes("Dependency"))).toBe(true);
  });

  it("accounts for deleted files", () => {
    const files = [
      makeFile({ path: "src/old.ts", isDeleted: true }),
      makeFile({ path: "src/also-old.ts", isDeleted: true }),
    ];
    const base = scoreRisk([makeFile()], [], []);
    const withDeleted = scoreRisk(files, [], []);
    expect(withDeleted.score).toBeGreaterThan(base.score);
  });
});