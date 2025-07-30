/**
 * @file config.ts
 * @description Handles loading and merging of TestCopilot configuration from a JSON file and CLI flags. Also provides default settings for use when no config file or flags are present.
 * @author Ian Shields
 */

import fs from 'fs';
import path from 'path';

/**
 * Defines the structure of the TestCopilot configuration.
 * This can come from either the config file or CLI flags.
 */
export interface TestCopilotConfig {
  checkers?: {
    raceConditionAnalysis?: boolean;
    assertionAnalysis?: boolean;
    deepNesting?: boolean;
    brittleSelectors?: boolean;
    longChains?: boolean;
    longTestStructure?: boolean;
    redundantShoulds?: boolean;
    falseConfidence?: boolean;
    asyncAnalysis?: boolean;
  };
  outputFormat?: 'console' | 'pdf' | 'both';
  issueExplain?: boolean;
  fileSummary?: boolean;
  codebaseAnalysis?: boolean;
}

/**
 * Default configuration used when no config file or flags are provided.
 */
export const defaultConfig: TestCopilotConfig = {
  checkers: {
    raceConditionAnalysis: true,
    assertionAnalysis: true,
    deepNesting: true,
    brittleSelectors: true,
    longChains: true,
    longTestStructure: true,
    redundantShoulds: true,
    falseConfidence: true,
    asyncAnalysis: true,
  },
  outputFormat: 'console',
  issueExplain: false,
  fileSummary: true,
  codebaseAnalysis: true
};

/**
 * Loads and merges the TestCopilot configuration.
 * Config values from the CLI override values from the config file.
 *
 * @param cliFlags - Partial config object from CLI flags
 * @returns Final merged configuration object
 */
export function loadConfig(cliFlags: Partial<TestCopilotConfig> = {}): TestCopilotConfig {
  const configPath = path.resolve(process.cwd(), 'testcopilot.config.json');
  let fileConfig: Partial<TestCopilotConfig> = {};

  // Try to load and parse config file if it exists
  if (fs.existsSync(configPath)) {
    try {
      const raw = fs.readFileSync(configPath, 'utf-8');
      fileConfig = JSON.parse(raw);
    } catch (err) {
      console.warn('⚠️ Failed to parse config file. Falling back to CLI flags only.');
    }
  }

  // Merge config file and CLI flags, giving priority to CLI
  return {
    ...defaultConfig,
    ...fileConfig,
    ...cliFlags,
    checkers: {
      ...defaultConfig.checkers,
      ...fileConfig.checkers,
      ...cliFlags.checkers,
    }
  };
}
