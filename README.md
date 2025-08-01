---

# TestCopilot Monorepo

This repo contains:
- `testcopilot-cli`: Command-line tool for Cypress test analysis
- `testcopilot-ui`: Web UI (Next.js) for drag-and-drop analysis
- `testcopilot-shared`: Shared checkers, types, and utilities
- `testcopilot-vsc`: VS Code extension

## 🏁 Quick Start (from Root)

### Install all dependencies (for all packages)
```sh
npm install
```


### Build all subprojects (shared, CLI, UI, extension)
```sh
npm run build
```

This command builds all subprojects in the monorepo:
- Shared logic
- CLI
- UI (testcopilot-ui)
- VS Code extension

**Note:** To build the root Next.js landing page (in `app/`), run:
```sh
next build
```
from the root directory.

### Clean all build output
```sh
npm run clean
```

### Run CLI (production build, after build)
```sh
npm run cli -- scan ./test-files
```

### Run CLI (dev mode, no build required)
```sh
npm run cli:dev -- scan ./test-files
```

### Run UI (Next.js dev server)
```sh
npm run ui
```

### Build VS Code extension
```sh
npm run vsc:build
```

---

## Best Practices for Running and Building

- **For quick dev/test:**  Use `npm run cli:dev` (ts-node, no build needed).
- **For production-like runs:**  Use `npm run build` then `npm run cli`.
- **To clean everything:**  Use `npm run clean`.
- **To build or run a specific package:**  Use `--workspace=<package>` (e.g., `npm run build --workspace=testcopilot-cli`).

---

## Summary Table for CLI/Build Commands

| Task                | Command (from root)                  |
|---------------------|--------------------------------------|
| Install all deps    | `npm install`                        |
| Build all subprojects   | `npm run build`                      |
| Build root landing page | `next build`                         |
| Clean all           | `npm run clean`                      |
| Run CLI (prod)      | `npm run cli -- scan ./test-files`   |
| Run CLI (dev/ts-node)| `npm run cli:dev -- scan ./test-files` |
| Run UI (Next.js)    | `npm run ui`                         |
| Build VSCode ext    | `npm run vsc:build`                  |

---

## Notes

- Changes to CLI or shared code require re-running `npm run build` from root
- Changes to UI auto-reload with `npm run ui`
- `testcopilot.config.json` should live in the root (or be passed via `--config`)

---

## Project Structure

- `/testcopilot-cli`: CLI tool for scanning test files.
- `/testcopilot-ui`: Web interface (Next.js app) for drag-and-drop test analysis and project-wide summaries.
- `/testcopilot-shared`: Shared checkers, types, and utilities for CLI, UI, and extension.
- `/testcopilot-vsc`: VS Code extension for in-editor diagnostics.

---

## ⚙️ Config Options

TestCopilot supports flexible configuration via flags or config file. All options below can be set in `testcopilot.config.json` or via CLI flags.

```json
{
  "outputFormat": "console", // or "summary", "pdf", "json", "both"
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
  "explain": false, // Show extra detail for each issue (line-by-line explanations)
  "detailedResults": true, // Show file-level summary after issues
  "codebaseAnalysis": false, // Show codebase-level summary at top
  "issueExplain": false // (if present) enables GPT-powered explanations for issues
}
```

### Flag Descriptions
- `outputFormat`: Controls output destination. Options: `console`, `pdf`, `both`, `summary`, `json`.
- `checkers`: Toggle individual analysis checkers on/off.
- `explain`: If true, adds extra detail for each issue (explanation and suggested fix).
- `detailedResults`: If true, adds a file-level summary after the issues for each file.
- `codebaseAnalysis`: If true, adds a codebase-level summary at the top of the output.
- `issueExplain`: If present and true, enables GPT-powered explanations for issues (future/optional).

