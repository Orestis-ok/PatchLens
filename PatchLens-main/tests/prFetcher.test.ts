// tests/prFetcher.test.ts

import { describe, it, expect } from "vitest";
import { parsePRUrl } from "../src/analyzer/prFetcher.js";

describe("parsePRUrl", () => {
  it("parses a standard GitHub PR URL", () => {
    const result = parsePRUrl("https://github.com/facebook/react/pull/123");
    expect(result.owner).toBe("facebook");
    expect(result.repo).toBe("react");
    expect(result.number).toBe(123);
  });

  it("parses a PR URL with trailing slash", () => {
    const result = parsePRUrl("https://github.com/vercel/next.js/pull/456/");
    expect(result.owner).toBe("vercel");
    expect(result.repo).toBe("next.js");
    expect(result.number).toBe(456);
  });

  it("throws a clear error for invalid URLs", () => {
    expect(() => parsePRUrl("https://github.com/owner/repo")).toThrow(
      "Invalid GitHub PR URL"
    );
  });

  it("throws for non-GitHub URLs", () => {
    expect(() =>
      parsePRUrl("https://gitlab.com/owner/repo/merge_requests/1")
    ).toThrow("Invalid GitHub PR URL");
  });

  it("parses PR number as an integer", () => {
    const result = parsePRUrl("https://github.com/owner/repo/pull/999");
    expect(typeof result.number).toBe("number");
    expect(result.number).toBe(999);
  });
});