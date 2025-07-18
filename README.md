# TestCopilot

TestCopilot is a tool for analyzing Cypress test files to flag poor patterns (like `cy.wait()`, deep `.then()` nesting, brittle selectors, and missing assertions) and provide a plain-English summary.

---

## Project Structure

- `/testcopilot-cli`: CLI tool for scanning test files.
- `/testcopilot-ui`: Web interface (Next.js app) for drag-and-drop test analysis and project-wide summaries.

---

## Usage (Always Run From Root)

### ✅ Production-like usage (globally installed)

```powershell
tcp scan .\path	to\your	tests
```

This will:
- Run the CLI tool from anywhere in your system (once globally linked)
- Analyze all `.js` and `.ts` Cypress test files in the given path

To generate a config file interactively:

```powershell
tcp init
```

---

### 🛠 Dev usage (without building or linking) (Always Run From Root)

```powershell
npx ts-node testcopilot-cli/src/index.ts scan ./test-files
```

This runs the CLI in dev mode directly via `ts-node`.

Use this during active development to avoid having to recompile and link every time.

---

## CLI Build & Setup (from `/testcopilot-cli`)

1. Compile the CLI TypeScript:
```powershell
npm run build
```

2. Link the CLI globally (to use the `tcp` command anywhere):
```powershell
npm link
```

---

## UI Dev Server (from root)

To run the drag-and-drop UI locally:
```powershell
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Notes

- Changes to CLI code require re-running `npm run build` from `/testcopilot-cli`
- Changes to UI auto-reload with `npm run dev` from root
- `testcopilot.config.json` should live in the root (or be passed via `--config`)

