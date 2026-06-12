// src/analyzer/riskScorer.ts
// Assigns a risk score (0–100) and level to a diff based on what changed.
// Each factor adds weighted points. Score bands → risk levels.

import type {
  ChangedFile,
  DependencyEdge,
  MissingTestWarning,
  RiskAssessment,
  RiskFactor,
  RiskLevel,
} from "../types.js";

function scoreToLevel(score: number): RiskLevel {
  if (score >= 75) return "critical";
  if (score >= 50) return "high";
  if (score >= 25) return "medium";
  return "low";
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function scoreRisk(
  changedFiles: ChangedFile[],
  dependencyEdges: DependencyEdge[],
  missingTestWarnings: MissingTestWarning[]
): RiskAssessment {
  const factors: RiskFactor[] = [];
  let rawScore = 0;

  const total = changedFiles.length;
  const hasDependencyChanges = changedFiles.some(
    (f) => f.category === "dependency"
  );
  const hasConfigChanges = changedFiles.some((f) => f.category === "config");
  const hasSchemaChanges = changedFiles.some((f) => f.category === "schema");
  const hasRouteChanges = changedFiles.some((f) => f.category === "routes");
  const deletedFiles = changedFiles.filter((f) => f.isDeleted);
  const newFiles = changedFiles.filter((f) => f.isNew);
  const affectedDeps = dependencyEdges.filter((e) => e.isAffected);
  const totalAdditions = changedFiles.reduce((s, f) => s + f.additions, 0);
  const totalDeletions = changedFiles.reduce((s, f) => s + f.deletions, 0);

  // Factor: number of files changed
  if (total > 20) {
    const w = 15;
    rawScore += w;
    factors.push({ description: `Large diff: ${total} files changed`, weight: w });
  } else if (total > 10) {
    const w = 8;
    rawScore += w;
    factors.push({ description: `Moderate diff: ${total} files changed`, weight: w });
  } else if (total > 5) {
    const w = 4;
    rawScore += w;
    factors.push({ description: `${total} files changed`, weight: w });
  }

  // Factor: line churn
  const churn = totalAdditions + totalDeletions;
  if (churn > 500) {
    const w = 15;
    rawScore += w;
    factors.push({ description: `High line churn: +${totalAdditions}/-${totalDeletions} lines`, weight: w });
  } else if (churn > 200) {
    const w = 8;
    rawScore += w;
    factors.push({ description: `Moderate line churn: +${totalAdditions}/-${totalDeletions} lines`, weight: w });
  }

  // Factor: dependency file changes (package.json, lock files)
  if (hasDependencyChanges) {
    const w = 20;
    rawScore += w;
    factors.push({
      description: "Dependency files modified (package.json / lock files)",
      weight: w,
    });
  }

  // Factor: config changes
  if (hasConfigChanges) {
    const w = 15;
    rawScore += w;
    factors.push({
      description: "Configuration files modified — check environment and build settings",
      weight: w,
    });
  }

  // Factor: schema / database migrations
  if (hasSchemaChanges) {
    const w = 25;
    rawScore += w;
    factors.push({
      description: "Database schema or migration files changed — high risk of data issues",
      weight: w,
    });
  }

  // Factor: route / API changes
  if (hasRouteChanges) {
    const w = 15;
    rawScore += w;
    factors.push({
      description: "API routes or controllers modified — check for breaking changes",
      weight: w,
    });
  }

  // Factor: deleted files
  if (deletedFiles.length > 0) {
    const w = Math.min(deletedFiles.length * 5, 20);
    rawScore += w;
    factors.push({
      description: `${deletedFiles.length} file(s) deleted — verify nothing still imports them`,
      weight: w,
    });
  }

  // Factor: cross-file dependency chains
  if (affectedDeps.length > 5) {
    const w = 15;
    rawScore += w;
    factors.push({
      description: `${affectedDeps.length} cross-file import chains detected — change may have wide blast radius`,
      weight: w,
    });
  } else if (affectedDeps.length > 0) {
    const w = 8;
    rawScore += w;
    factors.push({
      description: `${affectedDeps.length} cross-file dependency edges detected`,
      weight: w,
    });
  }

  // Factor: missing tests for changed source files
  if (missingTestWarnings.length > 3) {
    const w = 15;
    rawScore += w;
    factors.push({
      description: `${missingTestWarnings.length} changed source files have no corresponding tests`,
      weight: w,
    });
  } else if (missingTestWarnings.length > 0) {
    const w = 8;
    rawScore += w;
    factors.push({
      description: `${missingTestWarnings.length} source file(s) missing test coverage in this diff`,
      weight: w,
    });
  }

  // Factor: many new files (broad feature addition)
  if (newFiles.length > 5) {
    const w = 5;
    rawScore += w;
    factors.push({
      description: `${newFiles.length} new files added — review for completeness`,
      weight: w,
    });
  }

  const score = clamp(rawScore, 0, 100);
  const level = scoreToLevel(score);

  const explanations: Record<RiskLevel, string> = {
    low: "This diff has a limited blast radius. Straightforward review should suffice.",
    medium:
      "This diff touches several areas. Take care to verify the affected paths and test coverage.",
    high:
      "This diff has significant scope or touches risky areas. Careful manual review and testing is strongly recommended.",
    critical:
      "This diff is high-stakes: it modifies dependencies, schema, config, or has wide blast radius. Do not merge without thorough review, testing, and sign-off.",
  };

  return {
    score,
    level,
    factors,
    explanation: explanations[level],
  };
}

export function buildVerificationChecklist(
  changedFiles: ChangedFile[],
  missingTestWarnings: MissingTestWarning[]
): import("../types.js").VerificationItem[] {
  const items: import("../types.js").VerificationItem[] = [];

  const hasDeps = changedFiles.some((f) => f.category === "dependency");
  const hasConfig = changedFiles.some((f) => f.category === "config");
  const hasSchema = changedFiles.some((f) => f.category === "schema");
  const hasRoutes = changedFiles.some((f) => f.category === "routes");
  const hasUI = changedFiles.some((f) => f.category === "ui");
  const hasSource = changedFiles.some((f) => f.category === "source");

  // Always include these baseline checks
  items.push({
    area: "All",
    action: "Run the full test suite and confirm it passes",
  });
  items.push({
    area: "All",
    action: "Review the diff for unintended changes (debug logs, commented-out code, TODOs)",
  });

  if (hasSource || hasRoutes) {
    items.push({
      area: "Source Code",
      action: "Trace the call path for each modified function to identify callers",
    });
  }

  if (missingTestWarnings.length > 0) {
    items.push({
      area: "Test Coverage",
      action: `Write or update tests for: ${missingTestWarnings
        .slice(0, 3)
        .map((w) => w.sourceFile)
        .join(", ")}${missingTestWarnings.length > 3 ? " and others" : ""}`,
    });
  }

  if (hasDeps) {
    items.push({
      area: "Dependencies",
      action: "Run `npm audit` or equivalent to check for vulnerability introductions",
    });
    items.push({
      area: "Dependencies",
      action: "Check for peer dependency conflicts and update lock file if needed",
    });
  }

  if (hasConfig) {
    items.push({
      area: "Configuration",
      action: "Verify config changes work across dev, staging, and production environments",
    });
    items.push({
      area: "Configuration",
      action: "Check that no secrets or environment-specific values were hardcoded",
    });
  }

  if (hasSchema) {
    items.push({
      area: "Database / Schema",
      action: "Test the migration against a copy of production data before merging",
    });
    items.push({
      area: "Database / Schema",
      action: "Verify the migration is reversible or a rollback plan exists",
    });
    items.push({
      area: "Database / Schema",
      action: "Confirm the app handles both old and new schema during deploy (zero-downtime)",
    });
  }

  if (hasRoutes) {
    items.push({
      area: "API",
      action: "Check for breaking changes to request/response contracts",
    });
    items.push({
      area: "API",
      action: "Verify authentication and authorization middleware is still applied",
    });
    items.push({
      area: "API",
      action: "Test with actual HTTP requests (Postman / curl / integration tests)",
    });
  }

  if (hasUI) {
    items.push({
      area: "UI / Frontend",
      action: "Test affected UI components in all supported browsers/viewports",
    });
    items.push({
      area: "UI / Frontend",
      action: "Check for accessibility regressions",
    });
  }

  return items;
}

export function buildAffectedAreas(changedFiles: ChangedFile[]): string[] {
  const areas = new Set<string>();
  for (const file of changedFiles) {
    const dir = file.path.split("/")[0];
    if (dir) areas.add(dir);
  }
  return [...areas];
}

export function buildDownstreamImpact(
  changedFiles: ChangedFile[],
  dependencyEdges: DependencyEdge[]
): string[] {
  const impacts: string[] = [];

  const affectedEdges = dependencyEdges.filter((e) => e.isAffected);
  if (affectedEdges.length > 0) {
    const importers = [...new Set(affectedEdges.map((e) => e.importer))];
    impacts.push(
      `Files with imports from changed modules: ${importers.slice(0, 5).join(", ")}${importers.length > 5 ? ` and ${importers.length - 5} more` : ""}`
    );
  }

  const deletedFiles = changedFiles.filter((f) => f.isDeleted);
  if (deletedFiles.length > 0) {
    impacts.push(
      `Deleted files may break callers: ${deletedFiles.map((f) => f.path).join(", ")}`
    );
  }

  const schemaFiles = changedFiles.filter((f) => f.category === "schema");
  if (schemaFiles.length > 0) {
    impacts.push(
      "Database schema changes may affect all code that queries modified tables"
    );
  }

  const routeFiles = changedFiles.filter((f) => f.category === "routes");
  if (routeFiles.length > 0) {
    impacts.push("API route changes may affect all clients consuming those endpoints");
  }

  if (impacts.length === 0) {
    impacts.push("No obvious downstream impact detected from static analysis");
  }

  return impacts;
}

export function buildConfigWarnings(changedFiles: ChangedFile[]): string[] {
  const warnings: string[] = [];

  const depFiles = changedFiles.filter((f) => f.category === "dependency");
  for (const f of depFiles) {
    warnings.push(`Dependency file modified: \`${f.path}\` — review for version bumps and breaking changes`);
  }

  const configFiles = changedFiles.filter((f) => f.category === "config");
  for (const f of configFiles) {
    if (f.path.includes(".env")) {
      warnings.push(`Environment file modified: \`${f.path}\` — ensure secrets are not committed`);
    } else {
      warnings.push(`Config file modified: \`${f.path}\``);
    }
  }

  return warnings;
}