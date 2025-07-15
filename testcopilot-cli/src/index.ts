#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';

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
    console.log(chalk.cyan(`🔍 Scanning ${path}...`));
    // Scanner logic goes here
  });

program.parse();
