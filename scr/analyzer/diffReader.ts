// src/analyzer/diffReader.ts
// Reads git diff between two refs using simple-git.
// Returns a list of ChangedFile objects with line stats.

import simpleGit from "simple-git";
import type { ChangedFile } from "../types.js";

export interface RawDiffSummary {
  changedFiles: ChangedFile[];
  rawDiff: string;
}

// Parses the file status returned by simple-git's diffSummary.
// simple-git gives us: { files: [{ file, insertions, deletions, binary }] }
// and a separate status list from git status.
export async function readDiff(
  repoPath: string,
  base: string,
  head: string
): Promise<RawDiffSummary> {
  const git = simpleGit(repoPath);

  // Verify the refs exist before proceeding
  try {
    await git.revparse([base]);
    await git.revparse([head]);
  } catch {
    throw new Error(
      `Could not resolve git refs. Make sure '${base}' and '${head}' exist in this repository.`
    );
  }

  // Get the diff summary (insertions/deletions per file)
  const summary = await git.diffSummary([`${base}...${head}`]);

  // Get the full text diff for dependency parsing later
  const rawDiff = await git.diff([`${base}...${head}`]);

  // Get rename/add/delete status per file
  const nameStatus = await git.diff([
    "--name-status",
    `${base}...${head}`,
  ]);

  const statusMap = parseNameStatus(nameStatus);

  const changedFiles: ChangedFile[] = summary.files.map((f) => {
    const status = statusMap.get(f.file) ?? statusMap.get(normalizePath(f.file));
    return {
      path: f.file,
      category: "unknown", // Will be filled by fileClassifier
      additions: "insertions" in f ? (f.insertions as number) : 0,
      deletions: "deletions" in f ? (f.deletions as number) : 0,
      isNew: status?.type === "A",
      isDeleted: status?.type === "D",
      isRenamed: status?.type === "R",
      oldPath: status?.oldPath,
    };
  });

  return { changedFiles, rawDiff };
}

interface FileStatus {
  type: "A" | "D" | "M" | "R" | "C" | "U";
  oldPath?: string;
}

// Parses git --name-status output into a map of filepath -> status
function parseNameStatus(output: string): Map<string, FileStatus> {
  const map = new Map<string, FileStatus>();
  const lines = output.trim().split("\n").filter(Boolean);

  for (const line of lines) {
    const parts = line.split("\t");
    if (!parts[0] || !parts[1]) continue;

    const typeChar = parts[0][0] as FileStatus["type"];

    if (typeChar === "R" && parts[2]) {
      // Renamed: R\told_path\tnew_path
      map.set(parts[2], { type: "R", oldPath: parts[1] });
    } else {
      map.set(parts[1], { type: typeChar });
    }
  }

  return map;
}

function normalizePath(p: string): string {
  return p.replace(/\\/g, "/");
}
