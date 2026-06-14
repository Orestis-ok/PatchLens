// src/types.ts
// Central type definitions for PatchLens.
// All analyzer passes produce these structures; the reporter consumes them.

export type FileCategory =
  | "source"
  | "test"
  | "config"
  | "dependency"
  | "docs"
  | "schema"
  | "routes"
  | "ui"
  | "unknown";

export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface ChangedFile {
  path: string;
  category: FileCategory;
  additions: number;
  deletions: number;
  isNew: boolean;
  isDeleted: boolean;
  isRenamed: boolean;
  oldPath?: string;
}

export interface DependencyEdge {
  // The changed file that contains an import
  importer: string;
  // The module/file being imported
  imported: string;
  // Whether the imported path resolves to another changed file
  isAffected: boolean;
}

export interface RelatedTest {
  testFile: string;
  // The source file this test appears to cover
  sourceFile: string;
  // How confident we are in the match (0–1)
  confidence: number;
  reason: string;
}

export interface MissingTestWarning {
  sourceFile: string;
  reason: string;
}

export interface RiskFactor {
  description: string;
  weight: number; // 1–10
}

export interface RiskAssessment {
  score: number;        // 0–100
  level: RiskLevel;
  factors: RiskFactor[];
  explanation: string;
}

export interface VerificationItem {
  area: string;
  action: string;
}

export interface AnalysisResult {
  meta: {
    base: string;
    head: string;
    analyzedAt: string;
    repoPath: string;
    prUrl?: string;
    prTitle?: string;
    prAuthor?: string;
  };
  changedFiles: ChangedFile[];
  dependencyEdges: DependencyEdge[];
  relatedTests: RelatedTest[];
  missingTestWarnings: MissingTestWarning[];
  risk: RiskAssessment;
  verificationChecklist: VerificationItem[];
  affectedAreas: string[];
  downstreamImpact: string[];
  configWarnings: string[];
}

export interface AnalyzeOptions {
  base: string;
  head: string;
  output: string;
  format: "markdown" | "json";
  repoPath: string;
  prUrl?: string;
  token?: string;
}