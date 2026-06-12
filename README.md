# PatchLens 🔍

**Analyze git diffs and understand their technical impact across a repository.**

PatchLens reads a local git diff, classifies every changed file, maps dependency chains, identifies related tests, and produces a structured Markdown or JSON impact report — helping you answer:

> *"What could this change affect, what is risky, and what should I verify before merging?"*

---

## Features

- 📁 **File classification** — source, tests, config, deps, schema, routes, UI, docs
- 🔗 **Dependency mapping** — detects import/require chains between changed files
- 🧪 **Test finder** — matches changed source files to their test files
- ⚠️ **Missing test warnings** — flags source changes with no corresponding tests
- 📊 **Risk scoring** — 0–100 score with factor breakdown (low / medium / high / critical)
- ✅ **Verification checklist** — tailored action items per change type
- 📝 **Markdown + JSON output**
- 🤖 **GitHub Actions integration** — analyze every PR automatically

---

## Requirements

- [Node.js](https://nodejs.org) v18 or higher
- Git installed and available in your terminal
- A git repository with at least 2 commits to diff between

---

## Installation

### Clone and build from source

```bash
git clone https://github.com/Orestis-ok/PatchLens.git
cd PatchLens
npm install
npm run build
```

### Verify everything works

```bash
npm test
```

You should see `28 passed (28)` with no failures.

---

## Usage

Run PatchLens from inside any git repository (or point it at one with `--repo`):

```bash
node dist/cli.js analyze --base  --head 
```

### Options

| Option | Default | Description |
|--------|---------|-------------|
| `--base <ref>` | `main` | Base branch or commit to diff from |
| `--head <ref>` | `HEAD` | Head branch or commit to diff to |
| `--output <path>` | `patchlens-report.md` | Output file path |
| `--format <format>` | `markdown` | `markdown` or `json` |
| `--repo <path>` | Current directory | Path to the git repository |

### Common examples

```bash
# Analyze the last commit
node dist/cli.js analyze --base HEAD~1 --head HEAD

# Analyze a feature branch against main
node dist/cli.js analyze --base main --head my-feature-branch

# Compare two specific commits
node dist/cli.js analyze --base abc1234 --head def5678

# Output as JSON
node dist/cli.js analyze --base HEAD~1 --head HEAD --format json --output report.json

# Analyze a different repository
node dist/cli.js analyze --base main --head HEAD --repo C:/path/to/other-repo
```

### Link globally (optional)

After building, you can link PatchLens globally so you can run `patchlens` from anywhere:

```bash
npm link
patchlens analyze --base HEAD~1 --head HEAD
```

---

## Understanding the output

PatchLens writes a Markdown report (or JSON) containing:

- **Summary table** — files changed, lines added/deleted, risk level
- **Risk score breakdown** — each factor that contributed to the score with its weight
- **Changed files by category** — grouped into source, tests, config, deps, schema, routes, UI, docs
- **Directly affected areas** — top-level directories touched
- **Possible downstream impact** — files that import changed modules, API/schema ripple effects
- **Related tests** — test files found in the diff that correspond to changed source files
- **Missing test warnings** — source files changed with no corresponding test in the diff
- **Config & dependency warnings** — flags package.json, lock files, .env changes
- **Verification checklist** — actionable items tailored to what changed (API checks, migration safety, dep audits, etc.)

### Risk levels

| Level | Score | Meaning |
|-------|-------|---------|
| 🟢 LOW | 0–24 | Limited blast radius, straightforward review |
| 🟡 MEDIUM | 25–49 | Several areas touched, verify affected paths |
| 🟠 HIGH | 50–74 | Significant scope or risky areas, careful review needed |
| 🔴 CRITICAL | 75–100 | Schema, deps, or wide blast radius — thorough review required |

---

## Running tests

```bash
npm test
```

To run in watch mode while developing:

```bash
npm run test:watch
```

---

## Project structure
patchlens/

├── src/

│   ├── cli.ts                  ← Entry point, CLI command definitions

│   ├── types.ts                ← All shared TypeScript types

│   ├── analyzer/

│   │   ├── index.ts            ← Orchestrates all analysis passes

│   │   ├── diffReader.ts       ← Reads git diff via simple-git

│   │   ├── fileClassifier.ts   ← Classifies files by type

│   │   ├── dependencyMapper.ts ← Parses imports/exports

│   │   ├── testFinder.ts       ← Finds related tests

│   │   └── riskScorer.ts       ← Assigns risk scores

│   └── reporter/

│       ├── index.ts            ← Routes to markdown or json reporter

│       ├── markdownReporter.ts ← Builds Markdown report

│       └── jsonReporter.ts     ← Builds JSON report

├── tests/                      ← Unit tests (vitest)

├── fixtures/                   ← Sample diff for testing

└── dist/                       ← Compiled output (git-ignored)

---

## GitHub Actions

Add PatchLens to your CI pipeline to analyze every PR automatically:

```yaml
- name: Checkout
  uses: actions/checkout@v4
  with:
    fetch-depth: 0

- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: 20.x

- name: Install and build PatchLens
  run: |
    git clone https://github.com/Orestis-ok/PatchLens.git
    cd PatchLens && npm install && npm run build

- name: Run PatchLens on this PR
  run: |
    node PatchLens/dist/cli.js analyze \
      --base origin/${{ github.base_ref }} \
      --head HEAD \
      --output patchlens-report.md
```

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for branch naming, PR guidelines, and local setup instructions.

---

## Roadmap

| Version | Status | Goal |
|---------|--------|------|
| v0.1.0 | ✅ Complete | Local git diff → Markdown report, risk scoring, test warnings |
| v0.2.0 | 🔜 Planned | GitHub PR support (`--pr` flag), full-repo dependency walking |
| v1.0.0 | 📋 Planned | npm publish, official GitHub Action, stable JSON schema |

---

## License

MIT
