// src/analyzer/testFinder.ts
// Finds test files that are likely related to the changed source files.
// Uses naming conventions and directory proximity — no AST parsing required.

import path from "path";
import type {
  ChangedFile,
  RelatedTest,
  MissingTestWarning,
} from "../types.js";

// Common test file naming patterns relative to the source file.
// Given source: src/utils/parser.ts
// These generate candidates like: src/utils/parser.test.ts,
// tests/utils/parser.test.ts, etc.
function generateTestCandidates(filePath: string): string[] {
  const dir = path.dirname(filePath);
  const ext = path.extname(filePath);
  const base = path.basename(filePath, ext);

  const testExtensions = [
    `${base}.test${ext}`,
    `${base}.spec${ext}`,
    `${base}.test.ts`,
    `${base}.test.js`,
    `${base}.spec.ts`,
    `${base}.spec.js`,
  ];

  const candidates: string[] = [];

  for (const testExt of testExtensions) {
    // Same directory: src/utils/parser.test.ts
    candidates.push(path.join(dir, testExt).replace(/\\/g, "/"));

    // __tests__ subdirectory: src/utils/__tests__/parser.test.ts
    candidates.push(path.join(dir, "__tests__", testExt).replace(/\\/g, "/"));

    // Sibling tests/ directory: src/utils/tests/parser.test.ts
    candidates.push(path.join(dir, "tests", testExt).replace(/\\/g, "/"));

    // Top-level tests/ mirroring the src/ structure
    const relativePath = filePath.replace(/^src\//, "");
    const testBase = path.basename(relativePath, ext);
    const testDir = path.dirname(relativePath);

    candidates.push(
      path.join("tests", testDir, `${testBase}.test.ts`).replace(/\\/g, "/")
    );
    candidates.push(
      path.join("test", testDir, `${testBase}.test.ts`).replace(/\\/g, "/")
    );
    candidates.push(
      path.join("__tests__", testDir, `${testBase}.test.ts`).replace(/\\/g, "/")
    );
  }

  return [...new Set(candidates)];
}

// Returns true if a test file path appears to be for a given source file
function testMatchesSource(testPath: string, sourcePath: string): boolean {
  const sourceBase = path
    .basename(sourcePath, path.extname(sourcePath))
    .toLowerCase();
  const testBase = path
    .basename(testPath, path.extname(testPath))
    .toLowerCase()
    .replace(/\.(test|spec)$/, "");

  return testBase === sourceBase || testBase.startsWith(sourceBase);
}

export function findRelatedTests(
  changedFiles: ChangedFile[],
  allChangedFilePaths: string[]
): RelatedTest[] {
  const related: RelatedTest[] = [];
  const changedPathSet = new Set(allChangedFilePaths);

  // Get all test files that were changed
  const changedTests = changedFiles.filter((f) => f.category === "test");

  // Get all source files that were changed
  const changedSources = changedFiles.filter(
    (f) => f.category === "source" || f.category === "routes" || f.category === "ui"
  );

  for (const sourceFile of changedSources) {
    const candidates = generateTestCandidates(sourceFile.path);

    // Check if any candidate test paths are in the changed file set
    for (const candidate of candidates) {
      if (changedPathSet.has(candidate)) {
        related.push({
          testFile: candidate,
          sourceFile: sourceFile.path,
          confidence: 0.95,
          reason: "Test file was also modified in this diff",
        });
        break;
      }
    }

    // Check if any changed test files match this source by name
    for (const testFile of changedTests) {
      if (testMatchesSource(testFile.path, sourceFile.path)) {
        const alreadyAdded = related.some(
          (r) =>
            r.testFile === testFile.path && r.sourceFile === sourceFile.path
        );
        if (!alreadyAdded) {
          related.push({
            testFile: testFile.path,
            sourceFile: sourceFile.path,
            confidence: 0.75,
            reason: "Test file name matches source file name",
          });
        }
      }
    }
  }

  return related;
}

export function findMissingTests(
  changedFiles: ChangedFile[],
  relatedTests: RelatedTest[]
): MissingTestWarning[] {
  const warnings: MissingTestWarning[] = [];
  const coveredSources = new Set(relatedTests.map((r) => r.sourceFile));

  const sourceFiles = changedFiles.filter(
    (f) =>
      (f.category === "source" || f.category === "routes") &&
      !f.isDeleted
  );

  for (const sourceFile of sourceFiles) {
    if (!coveredSources.has(sourceFile.path)) {
      warnings.push({
        sourceFile: sourceFile.path,
        reason:
          "No test file found in the diff that corresponds to this source file",
      });
    }
  }

  return warnings;
}
