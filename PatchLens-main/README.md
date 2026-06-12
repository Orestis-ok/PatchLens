# PatchLens

**Analyze git diffs and understand their technical impact across a repository.**

PatchLens reads a local git diff, classifies every changed file, maps dependency chains, identifies related tests, and produces a structured Markdown or JSON impact report — helping you answer:

> *"What could this change affect, what is risky, and what should I verify before merging?"*

---

## Features

- 📁 **File classification** — source, tests, config, deps, schema, routes, UI, docs
- 🔗 **Dependency mapping** — detects import/require chains between changed files
- 🧪 **Test finder** — matches changed source files to their test files
- ⚠️ **Missing test warnings** — flags source changes with no corresponding tests
- 📊 **Risk scoring** — 0–100 score with factor breakdown
- ✅ **Verification checklist** — tailored action items per change type
- 📝 **Markdown + JSON output**
- 🤖 **GitHub Actions integration** — analyze every PR automatically

---

## Installation

### From source (development)

```bash
git clone https://github.com/YOUR_USERNAME/patchlens.git
cd patchlens
npm install
npm run build
```

### Link globally (after build)

```bash
npm link
# Now you can run: patchlens analyze
```

---

## Usage

```bash
# Analyze changes between main and your current branch
patchlens analyze --base main --head HEAD

# Custom output path
patchlens analyze --base main --head HEAD --output reports/my-report.md

# JSON format
patchlens analyze --base main --head HEAD --format json --output report.json

# Specific commits
patchlens analyze --base abc1234 --head def5678

# Different repository
patchlens analyze --base main --head HEAD --repo /path/to/other-repo
```

### Options

| Option | Default | Description |
|--------|---------|-------------|
| `--base <ref>` | `main` | Base branch or commit |
| `--head <ref>` | `HEAD` | Head branch or commit |
| `--output <path>` | `patchlens-report.md` | Output file path |
| `--format <format>` | `markdown` | `markdown` or `json` |
| `--repo <path>` | Current directory | Path to the git repository |

---

## Example Output

See [Example Report](#example-report) section below.

---

## Running Tests

```bash
npm test
```

---

## GitHub Actions

Add PatchLens to your CI pipeline to analyze every PR automatically:

```yaml
- name: Run PatchLens
  run: |
    npx patchlens analyze \
      --base origin/${{ github.base_ref }} \
      --head HEAD \
      --output patchlens-report.md
```

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

---

## License

MIT