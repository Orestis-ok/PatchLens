// src/analyzer/prFetcher.ts
// Fetches pull request diff data from the GitHub API.
// Supports public repos without a token, private repos with GITHUB_TOKEN.

export interface PRMeta {
  owner: string;
  repo: string;
  number: number;
  title: string;
  base: string;
  head: string;
  author: string;
  createdAt: string;
  url: string;
}

export interface PRData {
  meta: PRMeta;
  diff: string;
}

// Parses a GitHub PR URL into its components.
// Supports: https://github.com/owner/repo/pull/123
export function parsePRUrl(url: string): {
  owner: string;
  repo: string;
  number: number;
} {
  const match = url.match(
    /github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/
  );
  if (!match || !match[1] || !match[2] || !match[3]) {
    throw new Error(
      `Invalid GitHub PR URL: "${url}"\nExpected format: https://github.com/owner/repo/pull/123`
    );
  }
  return {
    owner: match[1],
    repo: match[2],
    number: parseInt(match[3], 10),
  };
}

// Fetches PR metadata and diff from the GitHub API.
export async function fetchPRData(
  prUrl: string,
  token?: string
): Promise<PRData> {
  const { owner, repo, number } = parsePRUrl(prUrl);

  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "PatchLens/0.2.0",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Step 1: Fetch PR metadata
  const metaUrl = `https://api.github.com/repos/${owner}/${repo}/pulls/${number}`;

  let metaResponse: Response;
  try {
    metaResponse = await fetch(metaUrl, { headers });
  } catch {
    throw new Error(
      "Could not reach the GitHub API. Check your internet connection."
    );
  }

  if (metaResponse.status === 404) {
    throw new Error(
      `PR not found: ${prUrl}\nIf this is a private repository, provide a token with --token or set GITHUB_TOKEN.`
    );
  }

  if (metaResponse.status === 403 || metaResponse.status === 429) {
    throw new Error(
      "GitHub API rate limit exceeded. Wait a few minutes, or provide a token with --token to increase your limit."
    );
  }

  if (!metaResponse.ok) {
    throw new Error(
      `GitHub API error: ${metaResponse.status} ${metaResponse.statusText}`
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prJson = (await metaResponse.json()) as any;

  const meta: PRMeta = {
    owner,
    repo,
    number,
    title: prJson.title ?? "Unknown",
    base: prJson.base?.ref ?? "unknown",
    head: prJson.head?.ref ?? "unknown",
    author: prJson.user?.login ?? "unknown",
    createdAt: prJson.created_at ?? new Date().toISOString(),
    url: prUrl,
  };

  // Step 2: Fetch the raw diff
  const diffHeaders = {
    ...headers,
    Accept: "application/vnd.github.v3.diff",
  };

  let diffResponse: Response;
  try {
    diffResponse = await fetch(metaUrl, { headers: diffHeaders });
  } catch {
    throw new Error("Could not fetch PR diff from GitHub API.");
  }

  if (!diffResponse.ok) {
    throw new Error(
      `Could not fetch PR diff: ${diffResponse.status} ${diffResponse.statusText}`
    );
  }

  const diff = await diffResponse.text();

  return { meta, diff };
}