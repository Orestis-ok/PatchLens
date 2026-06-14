// src/analyzer/index.ts
// Orchestrates all analysis passes and assembles the final AnalysisResult.
// Supports both local git diff and remote GitHub PR as data sources.

import { readDiff } from "./diffReader.js";
import { fetchPRData } from "./prFetcher.js";
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
import type { AnalysisResult, AnalyzeOptions, ChangedFile } from "../types.js";

// Parses the raw git diff text into ChangedFile objects.
// Used when analyzing a PR diff fetched from the GitHub API.
function parseChangedFilesFromDiff(rawDiff: string): ChangedFile[] {
  const files: ChangedFile[] = [];
  const fileBlocks = rawDiff.split(/^diff --git /m).filter(Boolean);

  for (const block of fileBlocks) {
    const headerMatch = block.match(/^a\/.+? b\/(.+?)\n/);
    if (!headerMatch) continue;

    const filePath = headerMatch[1].trim();
    const isNew = block.includes("\nnew file mode");
    const isDeleted = block.includes("\ndeleted file mode");
    const isRenamed = block.includes("\nsimilarity index");

    let oldPath: string | undefined;
    if (isRenamed) {
      const renameMatch = block.match(/^rename from (.+)$/m);
      if (renameMatch) oldPath = renameMatch[1].trim();
    }

    const lines = block.split("\n");
    let additions = 0;
    let deletions = 0;
    for (const line of lines) {
      if (line.startsWith("+") && !line.startsWith("+++")) additions++;
      if (line.startsWith("-") && !line.startsWith("---")) deletions++;
    }

    files.push({
      path: filePath,
      category: "unknown",
      additions,
      deletions,
      isNew,
      isDeleted,
      isRenamed,
      oldPath,
    });
  }

  return files;
}

export async function analyze(options: AnalyzeOptions): Promise<AnalysisResult> {
  const { base, head, repoPath, prUrl, token } = options;

  let rawDiff: string;
  let rawFiles: ChangedFile[];
  let prMeta: { title?: string; author?: string } = {};

  if (prUrl) {
    // ── GitHub PR mode ─────────────────────────────────────────
    const prData = await fetchPRData(prUrl, token);
    rawDiff = prData.diff;
    rawFiles = parseChangedFilesFromDiff(rawDiff);
    prMeta = { title: prData.meta.title, author: prData.meta.author };

    if (rawFiles.length === 0) {
      throw new Error(
        "No changed files found in this PR. It may be empty or already merged."
      );
    }
  } else {
    // ── Local git mode ─────────────────────────────────────────
    const result = await readDiff(repoPath, base, head);
    rawDiff = result.rawDiff;
    rawFiles = result.changedFiles;

    if (rawFiles.length === 0) {
      throw new Error(
        `No changed files found between '${base}' and '${head}'. Are these valid refs?`
      );
    }
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
      base: prUrl ? "PR base" : base,
      head: prUrl ? "PR head" : head,
      analyzedAt: new Date().toISOString(),
      repoPath,
      prUrl,
      prTitle: prMeta.title,
      prAuthor: prMeta.author,
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