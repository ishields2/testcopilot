# 🗂️ Configuration Strategy

TestCopilot CLI uses a shared schema for config validation and defaults, and keeps CLI and UI config files separate:

- **CLI config:** `testcopilot.config.json` (used by CLI commands)
- **UI config:** `testcopilot.ui.config.json` (used by the future UI)
- **Shared schema:** `testcopilot.config.schema.json` (used for validation and default values)

If no config file is present, defaults from the schema are applied automatically. Config files are never overwritten by the other tool (UI does not overwrite CLI config, and vice versa).

### Example Config

```json
{
  "checkers": {
    "raceConditionAnalysis": true,
    "assertionAnalysis": true,
    "deepNesting": true,
    "brittleSelectors": true,
    "longChains": true,
    "longTestStructure": true,
    "redundantShoulds": true,
    "falseConfidence": true,
    "asyncAnalysis": true
  },
  "outputFormat": "console",
  "explain": false
}
```

Run `tcp init` to interactively generate a config file with all options and defaults.
# TestCopilot CLI

**TestCopilot CLI** is the command-line tool that powers the Cypress test analysis engine. It detects poor practices in `.js` and `.ts` Cypress files and outputs a plain-English summary to help stabilize E2E tests.

---

## 🚀 Usage

### Run from root (globally linked)
```powershell
tcp scan .\path	to\your	tests
```

- Runs the CLI using the globally linked `tcp` command.
- Loads config from `testcopilot.config.json` in root, or use `--config` to specify another path.

### Run from root (dev mode, no build required)
```powershell
npx ts-node testcopilot-cli/src/index.ts scan ./test-files
```

- Great for development — no need to recompile or link.

---

## ⚙️ Dev Setup (from `/testcopilot-cli`)

```powershell
npm install        # Install deps
npm run build      # Compile TypeScript into dist/
npm link           # Globally link CLI as `tcp`
```

After linking, you can run `tcp` from anywhere.

---

## 📁 Folder Structure

```
testcopilot-cli/
├── src/
│   ├── index.ts             # CLI entry point
│   ├── config/              # Config loader utilities
│   ├── checkers/            # Rule checkers (e.g., wait, then)
│   └── output/              # Formatters, summaries
├── dist/                    # Compiled output (after build)
├── package.json
└── tsconfig.json
```

---

## 🔧 Config Format (`testcopilot.config.json`)

```json
{
  "checkers": {
    "raceConditionAnalysis": true,
    "assertionAnalysis": true
  },
  "outputFormat": "summary",
  "explain": true
}
```

Place this in your project root or use `--config` to specify a path.

---

## 🧪 Coming Soon

- `tcp init` command for interactive config generation
- Additional rule checkers and output formats
- Optional AI-powered summaries (Phase 2)

---

## 📄 License

MIT
