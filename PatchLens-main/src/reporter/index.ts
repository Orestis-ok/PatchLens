// src/reporter/index.ts
// Routes to the correct reporter based on the output format.

import fs from "fs/promises";
import path from "path";
import type { AnalysisResult, AnalyzeOptions } from "../types.js";
import { buildMarkdownReport } from "./markdownReporter.js";
import { buildJsonReport } from "./jsonReporter.js";

export async function writeReport(
  result: AnalysisResult,
  options: AnalyzeOptions
): Promise<void> {
  const content =
    options.format === "json"
      ? buildJsonReport(result)
      : buildMarkdownReport(result);

  // Ensure the output directory exists
  const dir = path.dirname(options.output);
  if (dir && dir !== ".") {
    await fs.mkdir(dir, { recursive: true });
  }

  await fs.writeFile(options.output, content, "utf-8");
}