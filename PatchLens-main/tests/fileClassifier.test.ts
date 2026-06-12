// tests/fileClassifier.test.ts

import { describe, it, expect } from "vitest";
import { classifyFile } from "../src/analyzer/fileClassifier.js";

describe("classifyFile", () => {
  it("classifies TypeScript source files", () => {
    expect(classifyFile("src/utils/parser.ts")).toBe("source");
    expect(classifyFile("src/services/auth.ts")).toBe("source");
  });

  it("classifies test files by extension", () => {
    expect(classifyFile("src/utils/parser.test.ts")).toBe("test");
    expect(classifyFile("src/utils/parser.spec.ts")).toBe("test");
  });

  it("classifies test files by directory", () => {
    expect(classifyFile("tests/parser.ts")).toBe("test");
    expect(classifyFile("src/__tests__/parser.ts")).toBe("test");
  });

  it("classifies dependency files", () => {
    expect(classifyFile("package.json")).toBe("dependency");
    expect(classifyFile("package-lock.json")).toBe("dependency");
    expect(classifyFile("yarn.lock")).toBe("dependency");
    expect(classifyFile("requirements.txt")).toBe("dependency");
  });

  it("classifies config files", () => {
    expect(classifyFile("tsconfig.json")).toBe("config");
    expect(classifyFile(".env.production")).toBe("config");
    expect(classifyFile("vite.config.ts")).toBe("config");
    expect(classifyFile("docker-compose.yml")).toBe("config");
  });

  it("classifies schema/migration files", () => {
    expect(classifyFile("db/migrations/001_create_users.sql")).toBe("schema");
    expect(classifyFile("schema.prisma")).toBe("schema");
  });

  it("classifies route files", () => {
    expect(classifyFile("src/routes/users.ts")).toBe("routes");
    expect(classifyFile("src/api/products.ts")).toBe("routes");
    expect(classifyFile("src/controllers/auth.ts")).toBe("routes");
  });

  it("classifies UI/frontend files", () => {
    expect(classifyFile("src/components/Button.tsx")).toBe("ui");
    expect(classifyFile("src/styles/main.css")).toBe("ui");
    expect(classifyFile("src/views/Home.jsx")).toBe("ui");
  });

  it("classifies documentation files", () => {
    expect(classifyFile("README.md")).toBe("docs");
    expect(classifyFile("docs/api.md")).toBe("docs");
    expect(classifyFile("CHANGELOG.md")).toBe("docs");
  });

  it("returns unknown for unrecognized files", () => {
    expect(classifyFile("something.xyz")).toBe("unknown");
  });
});