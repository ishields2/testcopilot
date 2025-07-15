#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const program = new commander_1.Command();
program
    .name('testcopilot')
    .description('Analyze Cypress tests for poor practices')
    .version('0.1.0');
program
    .command('scan')
    .description('Scan test files in the given path')
    .argument('<path>', 'file or folder to scan')
    .action((path) => {
    console.log(chalk_1.default.cyan(`🔍 Scanning ${path}...`));
    // Scanner logic goes here
});
program.parse();
