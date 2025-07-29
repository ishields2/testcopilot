#!/usr/bin/env node

/**
 * @file index.ts
 * @description
 * CLI entry point for TestCopilot. Sets up command parsing, loads configuration,
 * and initiates file scanning or interactive config generation.
 */

import { Command } from 'commander';           // CLI command and argument parser
import chalk from 'chalk';                     // Adds color to terminal output
import * as fs from 'fs';                      // Node file system module
import * as path from 'path';                  // Node path resolver
import { loadConfig } from './configLoader';   // Loads testcopilot.config.json if present
// @ts-ignore
import { Confirm, Select } from 'enquirer';    // Prompts from Enquirer
import readline from 'readline';               // For "press any key to continue"
import glob = require('glob');                 // Glob pattern matching for file discovery
import { registeredCheckers } from './checkers/registeredCheckers';
import type { CheckerOutput } from './types/CheckerOutput';
import { parse } from '@babel/parser';
import { printCheckerResult } from './cli/output/printCheckerResult';
import { aggregateCheckerResults } from './core/codebaseUtils';

const program = new Command(); // Create CLI instance

// Basic CLI setup
program
  .name('testcopilot')
  .description('Analyze Cypress tests for poor practices')
  .version('0.1.0');

// `scan` command – triggers test file scanning logic
program
  .command('scan')
  .description('Scan test files in the given path')
  .argument('<path>', 'file or folder to scan')
  .action((scanPath) => {
    const config = loadConfig();
    let testFiles: string[];
    try {
      testFiles = getTestFiles(scanPath);
    } catch (err) {
      console.error(chalk.red('❌ Error reading path:'), err);
      return;
    }

    if (testFiles.length === 0) {
      console.log(chalk.yellow('⚠️  No test files found.'));
      return;
    }

    const filesWithContent = readFiles(testFiles);

    console.log(chalk.cyan(`\n📂 Scanning ${testFiles.length} test file(s)...`));

    // Collect all file-level results for codebase analysis
    const allResults: CheckerOutput[] = [];
    for (const file of filesWithContent) {
      const { path: filePath, content } = file;

      console.log(chalk.magentaBright(`\n📄 File: ${filePath}`));

      const ast = parse(content, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx']
      });
      for (const checker of Object.values(registeredCheckers)) {
        if (!config.checkers?.[checker.key as keyof typeof config.checkers]) continue;
        console.log(`Running checker: ${checker.key}`);
        const result = checker.analyze({ path: filePath, content, ast });
        printCheckerResult(result, filePath, config.explain);
        allResults.push(result);
      }
    }

    // Output codebase-level summary if enabled in config
    if (config.codebaseAnalysis) {
      const codebaseReport = aggregateCheckerResults(allResults);
      console.log(chalk.greenBright('\n═══════════════════════════════════════════════════════════════════════════'));
      console.log(chalk.whiteBright('Codebase Analysis Summary'));
      console.log(chalk.greenBright('═══════════════════════════════════════════════════════════════════════════\n'));
      console.log(codebaseReport.plainSummary);
    }
  });


// `init` command – interactively creates a config file
program
  .command('init')
  .description('Generate a testcopilot.config.json file')
  .action(() => {
    runInit();
  });

/**
 * Pauses execution until any key is pressed
 */
function waitForKeypress(): Promise<void> {
  return new Promise((resolve) => {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.once('data', () => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      resolve();
    });
  });
}

/**
 * Interactive setup for generating testcopilot.config.json
 * Guides the user through checker selection and output preferences.
 */
async function runInit() {
  type ConfigAnswers = {
    outputFormat: 'summary' | 'json';
    explain: boolean;
    [key: string]: any;
  };

  // Full list of checkers with key and rich description (keys match config.ts and schema)
  const checkers = [
    {
      key: 'raceConditionAnalysis',
      prompt: 'Enable race condition analysis?',
      description: `Enhanced race condition analysis – flags patterns that may introduce race conditions, 
timing flakiness, or brittle test design. Offers alternative strategies such as custom retry logic, 
waiting on specific UI conditions and using cy.intercept() where applicable. This helps prevent flaky 
tests and encourages more robust async handling.`
    },
    {
      key: 'assertionAnalysis',
      prompt: 'Enable advanced assertion analysis?',
      description: `Flags tests that may pass without verifying application behavior. Helps identify false positives 
where test steps are executed but no outcome is validated, reducing the risk of unnoticed regressions.`
    },
    {
      key: 'deepNesting',
      prompt: 'Enable deep nesting analysis?',
      description: `Warns against excessive nesting and use of .then() calls, which can obscure test intent and increase 
cognitive load. Encourages flatter, more readable test structures using Cypress’ built-in chaining.`
    },
    {
      key: 'brittleSelectors',
      prompt: 'Enable enhanced brittle selector analysis?',
      description: `Flags selectors that are highly specific or likely to change (e.g. CSS classes, text content). 
Encourages use of stable selectors like data attributes to improve test resilience against UI changes.`
    },
    {
      key: 'longChains',
      prompt: 'Enable enhanced command chain analysis?',
      description: `Detects test steps that involve excessively chained commands. Encourages breaking up tests 
for clarity, debuggability, and better isolation of test failures.`
    },
    {
      key: 'longTestStructure',
      prompt: 'Enable long test structure analysis?',
      description: `Detects tests that are overly long, cover multiple user flows, or lack clear structure. 
Suggests breaking tests into smaller, focused units with clear assertions to improve reliability, 
maintainability, and test intent clarity. Helps reduce false positives and simplify debugging.`
    },
    {
      key: 'redundantShoulds',
      prompt: 'Enable .should() redundancy analysis?',
      description: `Identifies multiple chained assertions that test the same condition or are semantically redundant. 
Helps streamline tests by removing clutter and focusing on meaningful checks.`
    },
    {
      key: 'falseConfidence',
      prompt: 'Enable false confidence analysis?',
      description: `Detects tests that pass without validating any meaningful behavior. Useful for catching 
pseudo-tests that only check for element existence or rely on Cypress’ default retries to falsely indicate success.`
    },
    {
      key: 'asyncAnalysis',
      prompt: 'Enable enhanced async/await analysis?',
      description: `Highlights patterns where async/await is mixed incorrectly with Cypress' command queueing model, 
which can lead to unexpected behavior. Promotes correct async handling using Cypress’ built-in command chaining.`
    }
  ];

  // Display header once
  console.clear();
  console.log(chalk.whiteBright('╔════════════════════════════════════╗'));
  console.log(chalk.whiteBright('║        TestCopilot CLI             ║'));
  console.log(chalk.whiteBright('╚════════════════════════════════════╝'));
  console.log('\n' + chalk.greenBright('💻  Welcome to TestCopilot Config Setup') + '\n');
  console.log(chalk.white(
    `TestCopilot is an advanced code analysis tool that reviews Cypress tests for common pitfalls, poor practices,\n` +
    `and reliability risks — helping your team write clearer, more robust automated tests.`
  ));
  console.log(chalk.dim('\nPress any key to continue...'));
  await waitForKeypress();

  const answers: ConfigAnswers = {
    checkers: {},
    outputFormat: 'summary',
    explain: true
  };

  // Prompt for each checker individually
  for (const checker of checkers) {
    console.clear();
    console.log(chalk.whiteBright('╔════════════════════════════════════╗'));
    console.log(chalk.whiteBright('║        TestCopilot CLI             ║'));
    console.log(chalk.whiteBright('╚════════════════════════════════════╝'));
    console.log('\n' + chalk.greenBright('💻  Welcome to TestCopilot Config Setup') + '\n');
    console.log(chalk.yellowBright(`${checker.prompt}\n`));
    console.log(chalk.white(checker.description) + '\n');

    const enabled = await new Confirm({
      message: checker.prompt,
      initial: true,
      prefix: '✔'
    }).run();

    answers.checkers[checker.key] = enabled;
  }

  // Output format
  console.clear();
  console.log(chalk.whiteBright('╔════════════════════════════════════╗'));
  console.log(chalk.whiteBright('║        TestCopilot CLI             ║'));
  console.log(chalk.whiteBright('╚════════════════════════════════════╝'));
  console.log('\n' + chalk.greenBright('💻  Welcome to TestCopilot Config Setup') + '\n');

  const outputFormat = await new Select({
    message: 'Select output format (use ↑/↓ arrows + Enter):',
    choices: ['summary', 'json'],
    initial: 0,
    prefix: '✔'
  }).run();
  answers.outputFormat = outputFormat;

  // Plain-English summaries
  const explain = await new Confirm({
    message: 'Include plain-English code review summaries?',
    initial: true,
    prefix: '✔'
  }).run();
  answers.explain = explain;

  // Build config file object
  const config = {
    checkers: Object.fromEntries(
      checkers.map((c) => [c.key, answers.checkers[c.key] || false])
    ),
    outputFormat: answers.outputFormat,
    explain: answers.explain
  };

  const outputPath = path.resolve('testcopilot.config.json');
  fs.writeFileSync(outputPath, JSON.stringify(config, null, 2));
  console.log(`\n✅ Config file created at ${outputPath}\n`);
}

// Helper to get all test files (.js, .ts) in a folder or single file
function getTestFiles(scanPath: string): string[] {
  const absPath = path.resolve(scanPath);
  const stat = fs.statSync(absPath);
  if (stat.isFile()) {
    return [absPath];
  }
  // Recursively find all .js and .ts files
  return glob.sync(`${absPath.replace(/\\/g, '/')}/**/*.{js,ts}`, { nodir: true });
}

// Helper to read file contents
function readFiles(filePaths: string[]): { path: string, content: string }[] {
  return filePaths.map(path => ({
    path,
    content: fs.readFileSync(path, 'utf-8')
  }));
}

// Start CLI
program.parse();
