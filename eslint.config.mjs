import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';
import tseslint from 'typescript-eslint';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // ✅ Base configs from Next.js (legacy compat mode)
  ...compat.extends('next/core-web-vitals', 'next/typescript'),

  // ✅ Custom TS config using typescript-eslint (FlatConfig-native)
  ...tseslint.config({
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.json'],
        sourceType: 'module',
      },
    },
    rules: {
      semi: ['error', 'always'],                     // Enforce semicolons
      quotes: ['error', 'single'],                   // Prefer single quotes
      indent: ['error', 2],                          // 2-space indent
      'comma-dangle': ['error', 'only-multiline'],   // Trailing comma on multiline
      '@typescript-eslint/no-unused-vars': ['warn'], // Warn for unused vars
      'no-console': 'off',                           // Allow console
    },
  }),

  {
    ignores: ['testcopilot-cli/**/*', 'node_modules', 'dist'],
  },
];

export default eslintConfig;
