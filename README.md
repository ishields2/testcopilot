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


### How This Project Works (Plain English)

#### TypeScript, Node.js, and ts-node

- **TypeScript** is a language that adds types to JavaScript. You write `.ts` files, but Node.js (the runtime) only understands JavaScript (`.js`).
- **Transpiling/Building**: To run your code with Node.js, you need to "build" (transpile) your TypeScript into JavaScript. This is done with the TypeScript compiler (`tsc`). The output goes into `dist/` folders (or `.next/` for Next.js apps).
- **ts-node** is a tool that lets you run TypeScript files directly (without building first). It's great for development and quick testing, but not recommended for production because it's slower and doesn't catch all build errors ahead of time.

#### Build Process and `dist` Folders

- When you run `npm run build`, each package (CLI, shared, extension) uses `tsc` to convert `.ts` files to `.js` files. These go into a `dist/` folder (e.g., `testcopilot-cli/dist`).
- The `dist/` folder is what Node.js actually runs in production. You don't edit files in `dist/`—they are generated automatically from your source code.
- For Next.js apps, the build output is in a `.next/` folder instead of `dist/`.

#### Why Are Some Files Greyed Out?

- In VS Code, files in `dist/` or `.next/` may appear greyed out because they are build artifacts (generated files). They are not meant to be edited by hand.
- You can safely delete the `dist/` or `.next/` folders at any time; they'll be recreated the next time you run `npm run build`.

#### Typical Workflow

1. **Development:**
   - Edit `.ts` files in `src/` folders.
   - Use `npm run cli:dev` to run the CLI directly with `ts-node` (no build needed).
   - Use `npm run ui` to run the Next.js UI in dev mode (auto-reloads on changes).
2. **Production/Testing:**
   - Run `npm run build` to transpile everything to `dist/` (or `.next/`).
   - Run the CLI or extension from the built output (e.g., `npm run cli`).

#### Why This Structure?

- Keeps source code (`src/`) separate from build output (`dist/`), making it easy to clean up and avoid confusion.
- Allows fast iteration in dev (with `ts-node`), but reliable, optimized code in production (from `dist/`).

If you're new to TypeScript, Node.js, or monorepos, don't worry—this setup is very common and helps keep things organized as your project grows. You can always delete the `dist/` or `.next/` folders if you want a clean slate; just rebuild when needed.

