
# TestCopilot CLI

TestCopilot CLI is the command-line tool for Cypress test analysis. It detects poor practices in `.js` and `.ts` Cypress files and outputs a plain-English summary to help stabilize E2E tests.

---

## 🚀 Usage (from Monorepo Root)

- **Production build:**
  ```sh
  npm run build
  npm run cli -- scan ./test-files
  ```
- **Dev mode (no build required):**
  ```sh
  npm run cli:dev -- scan ./test-files
  ```

See the root README for more details and scripts.

---

## ⚙️ Config Format (`testcopilot.config.json`)

```json
{
  "checkers": {
    "raceConditionAnalysis": true,
    "assertionAnalysis": true
  },
  "outputFormat": "summary",
  "issueExplain": true
}
```

Place this in your project root or use `--config` to specify a path.

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

## 📄 License

MIT
