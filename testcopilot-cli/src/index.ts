#!/usr/bin/env node

/**
 * @file index.ts
 * @author Ian Shields
 * @description
 * CLI entry point for TestCopilot. Sets up command parsing, loads configuration,
 * and initiates file scanning or other actions.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { loadConfig } from './configLoader';

const program = new Command();

program
  .name('testcopilot')
  .description('Analyze Cypress tests for poor practices')
  .version('0.1.0');

program
  .command('scan')
  .description('Scan test files in the given path')
  .argument('<path>', 'file or folder to scan')
  .action((path) => {
  const config = loadConfig();
  console.log(chalk.yellowBright('✅ Loaded Config:'), config);
  console.log(chalk.cyan(`🔍 Scanning ${path}...`));
  // Scanner logic goes here
});

program.parse();
