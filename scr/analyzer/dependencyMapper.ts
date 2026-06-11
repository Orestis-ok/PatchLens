// src/analyzer/dependencyMapper.ts
// Parses import/require statements from the raw diff to build a simple
// dependency impact map. This is a best-effort static analysis —
// it won't catch dynamic imports or complex re-exports, but it surfaces
// the most obvious chains.

import type { ChangedFile, DependencyEdge } from "../types.js";

// Matches: import ... from '...' | require('...') | import('...')
const IMPORT_PATTERNS = [
  // ES module imports: import X from './foo'
  /import\s+(?:.*?\s+from\s+)?['"]([^'"]+)['"]/g,
  // CommonJS: require('./foo')
  /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  // Dynamic import: import('./foo')
  /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
];

// Extracts all import paths from a block of source code
export function extractImports(sourceCode: string): string[] {
  const imports: string[] = [];

  for (const pattern of IMPORT_PATTERNS) {
    // Reset lastIndex since we're reusing regexes with /g
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(sourceCode)) !== null) {
      const importPath = match[1];
      if (importPath) {
        imports.push(importPath);
      }
    }
  }

  return [...new Set(imports)]; // deduplicate
}

// Checks if a relative import path could resolve to one of the changed files.
// This is a simplified check — a proper resolver would use tsconfig paths etc.
function importMatchesChangedFile(
  importPath: string,
  changedFilePaths: Set<string>
): boolean {
  // Only analyze relative imports (./foo, ../bar)
  if (!importPath.startsWith(".")) return false;

  const possibleExtensions = [".ts", ".tsx", ".js", ".jsx", "/index.ts", "/index.js"];

  for (const changedPath of changedFilePaths) {
    // Strip extensions from the changed file path for comparison
    const base = changedPath
      .replace(/\.(ts|tsx|js|jsx)$/, "")
      .replace(/\/index$/, "");

    // Try matching the import path against the end of the changed file path
    const importBase = importPath
      .replace(/\.(ts|tsx|js|jsx)$/, "")
      .replace(/\/index$/, "");

    if (
      base.endsWith(importBase) ||
      changedPath.includes(importPath.replace("./", "").replace("../", ""))
    ) {
      return true;
    }

    // Check with extensions
    for (const ext of possibleExtensions) {
      if (changedFilePaths.has(importPath + ext)) return true;
    }
  }

  return false;
}

export interface DiffChunk {
  filePath: string;
  addedLines: string;
}

// Extracts added/modified lines per file from the raw git diff
export function parseDiffChunks(rawDiff: string): DiffChunk[] {
  const chunks: DiffChunk[] = [];
  const fileBlocks = rawDiff.split(/^diff --git /m).filter(Boolean);

  for (const block of fileBlocks) {
    // Extract the file path from the diff header: a/src/foo.ts b/src/foo.ts
    const headerMatch = block.match(/^a\/.+? b\/(.+?)\n/);
    if (!headerMatch) continue;

    const filePath = headerMatch[1].trim();

    // Collect only added lines (lines starting with +, not ++)
    const addedLines = block
      .split("\n")
      .filter((line) => line.startsWith("+") && !line.startsWith("+++"))
      .map((line) => line.slice(1))
      .join("\n");

    if (addedLines.trim()) {
      chunks.push({ filePath, addedLines });
    }
  }

  return chunks;
}

export function buildDependencyEdges(
  rawDiff: string,
  changedFiles: ChangedFile[]
): DependencyEdge[] {
  const edges: DependencyEdge[] = [];
  const changedFilePaths = new Set(changedFiles.map((f) => f.path));
  const chunks = parseDiffChunks(rawDiff);

  for (const chunk of chunks) {
    // Only analyze source-like files
    if (!/\.(ts|tsx|js|jsx|py)$/.test(chunk.filePath)) continue;

    const imports = extractImports(chunk.addedLines);

    for (const importPath of imports) {
      const isAffected = importMatchesChangedFile(importPath, changedFilePaths);
      edges.push({
        importer: chunk.filePath,
        imported: importPath,
        isAffected,
      });
    }
  }

  return edges;
}
