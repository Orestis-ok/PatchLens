// src/analyzer/index.ts
// Orchestrates all analysis passes and assembles the final AnalysisResult.

import { readDiff } from "./diffReader.js";
import { classifyFiles } from "./fileClassifier.js";
import { buildDependencyEdges } from "./dependencyMapper.js";
import { findRelatedTests, findMissingTests } from "./testFinder.js";
import {
  scoreRisk,
  buildVerificationChecklist,
  buildAffectedAreas,
  buildDownstreamImpact,
  buildConfigWarnings,
} from "./riskScorer.js";
import type { AnalysisResult, AnalyzeOptions } from "../types.js";

export async function analyze(options: AnalyzeOptions): Promise<AnalysisResult> {
  const { base, head, repoPath } = options;

  // Step 1: Read the raw diff from git
  const { changedFiles: rawFiles, rawDiff } = await readDiff(
    repoPath,
    base,
    head
  );

  if (rawFiles.length === 0) {
    throw new Error(
      `No changed files found between '${base}' and '${head}'. Are these valid refs?`
    );
  }

  // Step 2: Classify each file into a semantic category
  const changedFiles = classifyFiles(rawFiles);

  // Step 3: Build dependency impact map from import statements
  const dependencyEdges = buildDependencyEdges(rawDiff, changedFiles);

  // Step 4: Find related tests and detect missing coverage
  const allPaths = changedFiles.map((f) => f.path);
  const relatedTests = findRelatedTests(changedFiles, allPaths);
  const missingTestWarnings = findMissingTests(changedFiles, relatedTests);

  // Step 5: Score risk and build additional context
  const risk = scoreRisk(changedFiles, dependencyEdges, missingTestWarnings);
  const verificationChecklist = buildVerificationChecklist(
    changedFiles,
    missingTestWarnings
  );
  const affectedAreas = buildAffectedAreas(changedFiles);
  const downstreamImpact = buildDownstreamImpact(changedFiles, dependencyEdges);
  const configWarnings = buildConfigWarnings(changedFiles);

  return {
    meta: {
      base,
      head,
      analyzedAt: new Date().toISOString(),
      repoPath,
    },
    changedFiles,
    dependencyEdges,
    relatedTests,
    missingTestWarnings,
    risk,
    verificationChecklist,
    affectedAreas,
    downstreamImpact,
    configWarnings,
  };
}
