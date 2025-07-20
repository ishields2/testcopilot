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
  const schemaPath = path.resolve(__dirname, '../../testcopilot.config.schema.json');

  // Load shared config schema
  let schema: any = {};
  try {
    schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
  } catch (err) {
    console.warn('⚠️ Failed to load config schema. Using defaults only.');
    return defaultConfig;
  }

  // Use Ajv for validation and defaults
  const Ajv = require('ajv');
  const ajv = new Ajv({ useDefaults: true });
  const validate = ajv.compile(schema);

  // Try to load and parse config file if it exists
  if (fs.existsSync(configPath)) {
    try {
      const raw = fs.readFileSync(configPath, 'utf-8');
      let fileConfig = JSON.parse(raw);
      // Validate and apply schema defaults
      validate(fileConfig);
      if (!validate(fileConfig)) {
        console.warn('⚠️ Config validation failed. Using defaults only.');
        return defaultConfig;
      }
      return fileConfig;
    } catch (err) {
      console.warn('⚠️ Failed to parse config file. Using defaults only.');
      return defaultConfig;
    }
  }

  // No config file, use code defaults
  return defaultConfig;
}
