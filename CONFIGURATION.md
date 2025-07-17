# 🛠️ TestCopilot Configuration Strategy

This outlines how TestCopilot will handle configuration across CLI and UI for a smooth, flexible user experience.

---

## ✅ Supported Inputs

- **Single Cypress test file**
- **Folder of Cypress tests**
  - Folder uploads supported via `--dir` flag or `webkitdirectory` in UI

---

## 📤 Supported Outputs

- **CLI**:
  - Console output per file
  - Optional plain-English summary (`--summary`)
  - Exportable report (PDF or Markdown-style for early MVP)
- **UI**:
  - Per-file results in interactive table
  - Toggleable project-level summary
  - **Exportable report** (PDF or Markdown-style for early MVP)

---

## ⚙️ Config Options

Users can customize behavior via either flags or config file.

```json
// testcopilot.config.json
{
  "outputFormat": "console", // or "summary", "pdf", json
  "checkers": {
    "waitUsage": true,
    "thenNesting": true,
    "brittleSelectors": true,
    "longChains": true,
    "redundantShoulds": true,
    "falseConfidence": true,
    "missingAssertions": true,
    "asyncConfusion": true
  },
  "thresholds": {
    "maxThenDepth": 3,
    "maxChainLength": 10,
    "maxTestLines": 60
  }
}
```

---

## 🧩 CLI Flags

Users can override config file settings via command-line flags:

```
--config=testcopilot.config.json
--disable-checker=waitUsage
--output=summary
--max-then-depth=5
```

All CLI flags are optional if `testcopilot.config.json` exists.

---

## 🚀 `testcopilot init`

Run:

```
testcopilot init
```

This interactive setup prompts the user:

- Output format?
- Enable each checker? (Y/N)
- Set thresholds? (e.g., max lines per test)
- Save config to `testcopilot.config.json`

Can be re-run any time to regenerate the config.

---

## 🧠 UI and Config Interplay

- UI **mirrors the config schema**, but they **don’t read from or write to the file system**.
- Instead, the UI sets options using form controls mapped to the same structure.
- When a scan is run via the UI, these options are passed in-memory.
- If a user uploads a config file in the UI manually (optional), it overrides form settings.
- We may use a `source: "ui"` flag internally to skip CLI config if run from UI.

---

## 🕹️ Summary of Dev Design Rules

- Same schema used in both UI and CLI for consistency.
- Config is optional but encouraged (`testcopilot.config.json`).
- Flags always override config.
- `init` sets up a default config file.
- UI presents toggles for all checkers + thresholds.
- Report export is MVP deliverable (PDF or Markdown).
- No auto-fix, GPT, or multi-lang yet – Phase 2.

---

## 🔧 New Dev Tasks (Add to Backlog)

- [ ] Implement support for testcopilot.config.json
- [ ] Add CLI flags for all major options (checker toggles + thresholds)
- [ ] Scaffold `testcopilot init` with interactive prompts and config writer
- [ ] Mirror CLI config schema in UI controls (no file read/write)
- [ ] Support report export (basic PDF or Markdown format)
