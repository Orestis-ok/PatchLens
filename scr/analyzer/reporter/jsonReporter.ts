// src/reporter/jsonReporter.ts
// Serializes the AnalysisResult to formatted JSON.
// Useful for programmatic consumption by other tools or CI pipelines.

import type { AnalysisResult } from "../types.js";

export function buildJsonReport(result: AnalysisResult): string {
  return JSON.stringify(result, null, 2);
}
