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
    console.log(chalk.yellowBright('✅ Loaded Config:'), config);
    console.log(chalk.cyan(`🔍 Scanning ${scanPath}...`));
    // File scanning logic will go here
  });

// `init` command – interactively creates a config file
program
  .command('init')
  .description('Generate a testcopilot.config.json file')
  .action(() => {
    runInit();
  });

/**
 * Interactive setup for generating testcopilot.config.json
 * Guides the user through checker selection and output preferences.
 */
async function runInit() {
  const inquirer = (await import('inquirer')).default;

  type ConfigAnswers = {
    outputFormat: 'summary' | 'json';
    explain: boolean;
    [key: string]: any;
  };

  // Full list of checkers with key and rich description
  const checkers = [
    {
      key: 'waitUsage',
      prompt: 'Enable enhanced cy.wait() analysis?',
      description: `Enhanced analysis of cy.wait() usage – flags patterns that may introduce race conditions, 
timing flakiness, or brittle test design. Offers alternative strategies such as custom retry logic, 
waiting on specific UI conditions and using cy.intercept() where applicable. This helps prevent flaky 
tests and encourages more robust async handling.`
    },
    {
      key: 'missingAssertions',
      prompt: 'Enable advanced assertion analysis?',
      description: `Flags tests that may pass without verifying application behavior. Helps identify false positives 
where test steps are executed but no outcome is validated, reducing the risk of unnoticed regressions.`
    },
    {
      key: 'deepThenNesting',
      prompt: 'Enable .then() chain nesting analysis?',
      description: `Warns against excessive chaining of .then() calls, which can obscure test intent and increase 
cognitive load. Encourages flatter, more readable test structures using Cypress’ built-in chaining instead.`
    },
    {
      key: 'brittleSelectors',
      prompt: 'Enable enhanced brittle selector analysis?',
      description: `Flags selectors that are highly specific or likely to change (e.g. CSS classes, text content). 
Encourages use of stable selectors like data attributes to improve test resilience against UI changes.`
    },
    {
      key: 'longCommandChains',
      prompt: 'Enable enhanced command chain analysis?',
      description: `Detects test steps that involve excessively chained commands. Encourages breaking up tests 
for clarity, debuggability, and better isolation of test failures.`
    },
    {
      key: 'redundantShoulds',
      prompt: 'Enable .should() redundancy analysis?',
      description: `Identifies multiple chained assertions that test the same condition or are semantically redundant. 
Helps streamline tests by removing clutter and focusing on meaningful checks.`
    },
    {
      key: 'falseConfidenceHeuristic',
      prompt: 'Enable false confidence analysis?',
      description: `Detects tests that pass without validating any meaningful behavior. Useful for catching 
pseudo-tests that only check for element existence or rely on Cypress’ default retries to falsely indicate success.`
    },
    {
      key: 'asyncAwaitConfusion',
      prompt: 'Enable enhanced async/await misuse analysis?',
      description: `Highlights patterns where async/await is mixed incorrectly with Cypress' command queueing model, 
which can lead to unexpected behavior. Promotes correct async handling using Cypress’ built-in command chaining.`
    }
  ];

  // Intro
  console.log('\n' + chalk.greenBright('🎛️  Welcome to TestCopilot Config Setup') + '\n');
  console.log(chalk.white(
    `TestCopilot is an advanced code analysis tool that reviews Cypress tests for common pitfalls, poor practices,\n` +
    `and reliability risks — helping your team write clearer, more robust automated tests.\n`
  ));
  console.log(chalk.dim('Answer Y/N for each analysis option below.\n'));

  const answers: ConfigAnswers = {
    checkers: {},
    outputFormat: 'summary',
    explain: true
  };

  // Prompt for each checker individually
  for (const checker of checkers) {
    console.log('\n' + chalk.yellowBright(`${checker.prompt}\n`));
    console.log(chalk.white(checker.description) + '\n');
    const { enabled } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'enabled',
        message: checker.prompt,
        default: true
      }
    ]);
    answers.checkers[checker.key] = enabled;
  }

  // Output format
  const { outputFormat } = await inquirer.prompt([
    {
      type: 'list',
      name: 'outputFormat',
      message: 'Select output format:',
      choices: ['summary', 'json'],
      default: 'summary'
    }
  ]);
  answers.outputFormat = outputFormat;

  // Plain-English summaries
  const { explain } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'explain',
      message: 'Include plain-English code review summaries?',
      default: true
    }
  ]);
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

// Start CLI
program.parse();

