# Contributing to PatchLens

Thank you for your interest in contributing! This document covers how to get started.

## Development Setup

1. Fork and clone the repository
2. Install dependencies: `npm install`
3. Run tests: `npm test`
4. Build: `npm run build`
5. Run locally: `npx ts-node --esm src/cli.ts analyze --base main --head HEAD`

## Branch Naming

| Type | Pattern | Example |
|------|---------|---------|
| Feature | `feat/short-description` | `feat/github-pr-support` |
| Bug fix | `fix/short-description` | `fix/classifier-tsx-edge-case` |
| Docs | `docs/short-description` | `docs/update-readme` |
| Chore | `chore/short-description` | `chore/upgrade-vitest` |
| Release | `release/v0.x.0` | `release/v0.2.0` |

## Pull Request Guidelines

- Keep PRs focused — one feature or fix per PR
- All tests must pass before requesting review
- Add tests for new logic
- Update the README if you change CLI options
- Include a brief description of what changed and why

## Code Style

- TypeScript strict mode is enabled — no `any` without justification
- Use `// comments` only to explain *why*, not *what*
- Run `npm run lint` before submitting

## Reporting Bugs

Open an issue with:
- PatchLens version (`patchlens --version`)
- Node.js version (`node --version`)
- The command you ran
- The error output
- The git repository structure (anonymized if needed)

## Feature Requests

Open an issue tagged `enhancement` and describe the use case, not just the feature.
