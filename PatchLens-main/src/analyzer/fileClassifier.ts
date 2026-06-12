// src/analyzer/fileClassifier.ts
// Classifies each changed file into a semantic category based on
// its path, directory structure, and file extension.

import path from "path";
import type { ChangedFile, FileCategory } from "../types.js";

// Pattern sets for each category.
// Order matters — more specific patterns should come first.
const CATEGORY_PATTERNS: Array<{
  category: FileCategory;
  patterns: RegExp[];
}> = [
{
    category: "test",
    patterns: [
      /\.(test|spec)\.(ts|tsx|js|jsx|py|rb|go|java)$/,
      /\/__tests__\//,
      /(^|\/)__tests__\//,
      /(^|\/)tests?\//,
      /(^|\/)spec\//,
      /\.test$/,
    ],
  },
  {
    category: "dependency",
    patterns: [
      /^package\.json$/,
      /^package-lock\.json$/,
      /^yarn\.lock$/,
      /^pnpm-lock\.yaml$/,
      /^Cargo\.toml$/,
      /^Cargo\.lock$/,
      /^requirements\.txt$/,
      /^pyproject\.toml$/,
      /^Gemfile(\.lock)?$/,
      /^go\.mod$/,
      /^go\.sum$/,
      /^composer\.json$/,
      /^build\.gradle(\.kts)?$/,
      /^pom\.xml$/,
    ],
  },
  {
    category: "config",
    patterns: [
      /\.(env|env\.local|env\.production|env\.development)$/,
      /^\.env/,
      /\.(config|conf|cfg|ini|toml|yaml|yml|json)$/,
      /^(tsconfig|jsconfig|babel\.config|webpack\.config|vite\.config|rollup\.config)/,
      /\.(eslintrc|prettierrc|editorconfig)$/,
      /^(Dockerfile|docker-compose)/,
      /^\.github\//,
      /^Makefile$/,
      /^\.eslintrc/,
    ],
  },
  {
    category: "schema",
    patterns: [
      /\/migrations?\//,
      /\.sql$/,
      /\.prisma$/,
      /\/schema\.(ts|js|graphql|gql)$/,
      /graphql\.(ts|js|schema)$/,
      /\.graphql$/,
      /\/models?\//,
    ],
  },
  {
    category: "routes",
    patterns: [
      /\/routes?\//,
      /\/api\//,
      /\/controllers?\//,
      /\/endpoints?\//,
      /\/(pages|app)\/.*\.(ts|tsx|js|jsx)$/, // Next.js / Remix pages
      /\.route\.(ts|js)$/,
    ],
  },
  {
    category: "ui",
    patterns: [
      /\.(tsx|jsx)$/,
      /\.(css|scss|sass|less|styl)$/,
      /\/components?\//,
      /\/views?\//,
      /\/layouts?\//,
      /\/styles?\//,
      /\/ui\//,
      /\.html$/,
      /\.svg$/,
    ],
  },
  {
    category: "docs",
    patterns: [
      /\.md$/,
      /\.mdx$/,
      /\.rst$/,
      /\.txt$/,
      /^docs?\//,
      /^CHANGELOG/,
      /^LICENSE/,
      /^README/,
    ],
  },
  {
    category: "source",
    patterns: [
      /\.(ts|tsx|js|jsx|py|rb|go|java|cs|cpp|c|h|rs|swift|kt|scala|php)$/,
    ],
  },
];

export function classifyFile(filePath: string): FileCategory {
  const normalized = filePath.replace(/\\/g, "/").toLowerCase();

  for (const { category, patterns } of CATEGORY_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(normalized)) {
        return category;
      }
    }
  }

  return "unknown";
}

export function classifyFiles(files: ChangedFile[]): ChangedFile[] {
  return files.map((file) => ({
    ...file,
    category: classifyFile(file.path),
  }));
}

// Returns a human-readable label for each category
export function categoryLabel(category: FileCategory): string {
  const labels: Record<FileCategory, string> = {
    source: "Source Code",
    test: "Tests",
    config: "Configuration",
    dependency: "Dependencies",
    docs: "Documentation",
    schema: "Database / Schema",
    routes: "Routes / API",
    ui: "UI / Frontend",
    unknown: "Other",
  };
  return labels[category];
}

// Groups files by their category for reporting
export function groupByCategory(
  files: ChangedFile[]
): Map<FileCategory, ChangedFile[]> {
  const groups = new Map<FileCategory, ChangedFile[]>();
  for (const file of files) {
    const group = groups.get(file.category) ?? [];
    group.push(file);
    groups.set(file.category, group);
  }
  return groups;
}

// Returns the file extension
export function getExtension(filePath: string): string {
  return path.extname(filePath).toLowerCase().replace(".", "");
}