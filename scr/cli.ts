// src/cli.ts
// PatchLens CLI entry point.
// Defines the `analyze` command with all options, runs the analysis pipeline,
// and writes the report.

import { Command } from "commander";
import chalk from "chalk";
import path from "path";
import { analyze } from "./analyzer/index.js";
import { writeReport } from "./reporter/index.js";
import type { AnalyzeOptions } from "./types.js";

const program = new Command();

program
  .name("patchlens")
  .description(
    "Analyze a git diff and explain its technical impact across a repository."
  )
  .version("0.1.0");

program
  .command("analyze")
  .description("Analyze the diff between two git refs and produce an impact report")
  .option("--base <ref>", "Base branch or commit to diff from", "main")
  .option("--head <ref>", "Head branch or commit to diff to", "HEAD")
  .option("--output <path>", "Output file path", "patchlens-report.md")
  .option("--format <format>", "Output format: markdown or json", "markdown")
  .option("--repo <path>", "Path to the git repository", process.cwd())
  .action(async (opts) => {
    const options: AnalyzeOptions = {
      base: opts.base,
      head: opts.head,
      output: path.resolve(opts.output),
      format: opts.format === "json" ? "json" : "markdown",
      repoPath: path.resolve(opts.repo),
    };

    console.log("");
    console.log(chalk.bold.cyan("  🔍 PatchLens") + chalk.gray(" — diff impact analyzer"));
    console.log("");
    console.log(chalk.gray(`  Repository : ${options.repoPath}`));
    console.log(chalk.gray(`  Base       : ${options.base}`));
    console.log(chalk.gray(`  Head       : ${options.head}`));
    console.log(chalk.gray(`  Output     : ${options.output}`));
    console.log(chalk.gray(`  Format     : ${options.format}`));
    console.log("");

    try {
      console.log(chalk.blue("  [1/3]") + " Reading git diff...");
      const result = await analyze(options);

      const total = result.changedFiles.length;
      const riskColor =
        result.risk.level === "critical"
          ? chalk.red
          : result.risk.level === "high"
          ? chalk.yellow
          : result.risk.level === "medium"
          ? chalk.blue
          : chalk.green;

      console.log(chalk.blue("  [2/3]") + ` Analyzed ${total} changed files`);
      console.log(
        chalk.blue("  [3/3]") +
          " Risk score: " +
          riskColor(
            `${result.risk.level.toUpperCase()} (${result.risk.score}/100)`
          )
      );

      await writeReport(result, options);

      console.log("");
      console.log(
        chalk.green("  ✓ Report written to: ") + chalk.bold(options.output)
      );

      if (result.missingTestWarnings.length > 0) {
        console.log(
          chalk.yellow(
            `  ⚠  ${result.missingTestWarnings.length} source file(s) are missing test coverage in this diff`
          )
        );
      }

      if (result.configWarnings.length > 0) {
        console.log(
          chalk.yellow(
            `  ⚠  ${result.configWarnings.length} config/dependency warning(s) found`
          )
        );
      }

      console.log("");

      // Exit with non-zero code on critical risk so CI pipelines can react
      if (result.risk.level === "critical") {
        process.exit(1);
      }
    } catch (err) {
      console.error("");
      console.error(chalk.red("  ✗ Analysis failed:"), (err as Error).message);
      console.error("");
      process.exit(1);
    }
  });

program.parse(process.argv);
