### 🧮 How TestCopilot Scores Files

TestCopilot gives each test file a score out of 100 based on two things:

1. ✅ **How many tests pass**
2. ⚠️ **How serious the problems are in the ones that fail**

We split the score like this:

- **70%** of the score is based on the pass rate  
  → The more tests that pass, the higher the base score  
- **30%** is based on the severity of issues in failing tests  
  → We deduct points for each SEVERE, MEDIUM, or LOW issue

---

### 🔢 Example

A file has 10 tests and 1 of them fails with a **MEDIUM** warning:

- ✅ 9/10 tests passed → 90% pass rate → earns **63 points** (70 × 0.9)
- ⚠️ 1 medium issue → subtract **3 points** from quality score (starts at 30)

**Final score = 63 + 27 = 90**

---

### 🚨 Severity Deductions

If a test has an issue, we deduct from the 30% "quality" portion of the score:

- **SEVERE** → -6 points
- **MEDIUM** → -3 points
- **LOW** → -1.5 points

---

### ✅ Why This Makes Sense

- Rewards files where most tests pass
- Penalises files with more or worse issues
- Avoids giving small files inflated scores from just a single pass
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

