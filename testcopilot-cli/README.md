# TestCopilot CLI

**TestCopilot** is a command-line tool to analyze Cypress test files and identify poor practices, brittle patterns, and potential flakiness.

It’s the core of the **Phase 1 MVP** for TestCopilot — focused on **local-only**, fast feedback to help developers write more stable E2E tests with zero telemetry.

---

## 🚀 Usage

```
npx testcopilot scan .\tests
# or, if globally linked
tcp scan .\tests
```

---

## 🧰 Features (MVP Scope)

- ✅ Detects:
  - Usage of `.wait()`
  - Deep `.then()` nesting
  - Brittle selectors (e.g. overuse of `:nth-child`, `div > div`, etc.)
  - Long Cypress command chains
  - Missing or weak assertions (e.g. no `should()` or `expect()` used)
- ✅ Outputs:
  - Plain-English **"Code Review" summary** per file
  - CLI output with severity levels and suggestions
- ✅ Supports:
  - `--config` flag to load a JSON config file
  - Fallback to `.testcopilotrc` or `testcopilot.config.json`
  - (Coming soon) `testcopilot init` interactive setup wizard

---

## 📦 Development

To run locally:

```
npm install            # Install dependencies
npm run build          # Build TypeScript into dist/
npm link               # Link CLI globally for development
tcp scan .\tests       # Run CLI
```

Ensure your `tsconfig.json` outputs to `dist/`, and that `package.json` has the correct `bin` entry:

```
"bin": {
  "tcp": "dist/index.js",
  "testcopilot": "dist/index.js"
}
```

---

## 🧪 Example Config File

```
{
  "checkWaitUsage": true,
  "checkThenNesting": true,
  "checkBrittleSelectors": true,
  "checkLongChains": true,
  "checkMissingAssertions": true
}
```

You can save this as `testcopilot.config.json` or `.testcopilotrc` in your project root and run:

```
tcp scan ./cypress/e2e
```

Or use the `--config` flag to specify a path.

---

## 🧱 Folder Structure

```
testcopilot-cli/
├── src/
│   ├── index.ts             # CLI entrypoint
│   ├── commands/scan.ts     # Main command logic
│   └── config/loadConfig.ts # Config loader (coming next)
├── dist/                    # Compiled JS output
├── package.json
└── tsconfig.json
```

---

## 📄 License

MIT
