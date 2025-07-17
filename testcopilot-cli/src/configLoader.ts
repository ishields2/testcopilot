/**
 * @file configLoader.ts
 * @author Ian Shields
 * @description
 * Loads and merges user-defined configuration (testcopilot.config.json)
 * with the default configuration defined in config.ts.
 * This ensures CLI runs with the correct effective config, whether or not
 * a custom config file exists.
 */

import fs from 'fs';
import path from 'path';
import { defaultConfig, TestCopilotConfig } from './config';

/**
 * Loads a testcopilot.config.json file if it exists in the current working directory,
 * and merges it with the default configuration.
 *
 * @returns {TestCopilotConfig} - The final, merged configuration object to use.
 */
export function loadConfig(): TestCopilotConfig {
  const configPath = path.resolve(process.cwd(), 'testcopilot.config.json');

  if (fs.existsSync(configPath)) {
    try {
      const userConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as Partial<TestCopilotConfig>;
      return { ...defaultConfig, ...userConfig };
    } catch (err) {
      console.warn('⚠️ Failed to load config file. Using defaults instead.');
      return defaultConfig;
    }
  }

  return defaultConfig;
}
