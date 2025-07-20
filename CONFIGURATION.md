# ⚖️ Configuration Precedence & Default Logic

TestCopilot uses multiple sources for configuration defaults and applies a clear precedence order:

## Sources of Defaults

- **Code defaults:** Defined in `defaultConfig` in `testcopilot-cli/src/config.ts` (used by CLI)
- **Schema defaults:** Defined in `testcopilot.config.schema.json` (used by both CLI and UI for validation and filling missing values)
- **Config files:**
  - `testcopilot.config.json` (CLI config)
  - `testcopilot.ui.config.json` (UI config)

## Precedence Order (CLI)

1. **CLI flags** (highest priority, if provided)
2. **Values in `testcopilot.config.json`**
3. **Schema defaults** (fill in missing values when validating config file)
4. **Code defaults** (used only if no config file is present)

## Precedence Order (UI)

1. **UI form values** (highest priority, if set)
2. **Values in `testcopilot.ui.config.json`**
3. **Schema defaults** (fill in missing values when validating config file)

## How It Works

- If a config file is present (i.e. `testcopilot.config.json` or `testcopilot.ui.config.json`), its values are used. 
- If an option is missing from the config file, the value is picked up from `testcopilot.config.schema.json` (schema defaults)
- If no config file is present at all, the CLI uses the `defaultConfig` and values from `src/config.ts` as the base config.
- Essentially, the schema defaults in `testcopilot.config.schema.json` are used to replace any missing values IF the relevant 
  config file is present. If it's not present, the code defaults are used and the schema ones are ignored. 
- CLI flags (if provided) always override config file and defaults.
- UI uses its own config file and form values, never overwriting CLI config.

## Example Scenarios

### 1. No config file present
**Result:** CLI uses `defaultConfig` from code. All values are set as in code.

### 2. Partial config file present
**Result:** CLI loads the config file and validates it against the schema. Any missing options are filled in using schema defaults (not code defaults). `defaultConfig` is only used if there is no config file at all.

### 3. Config file present, some options missing, schema default differs from code default
**Result:** Missing options are filled in using schema defaults, not code defaults. For example, if `falseConfidence` is missing from the config file, and the schema default is `false` but the code default is `true`, the loaded config will use `false`.

### 4. CLI flag provided
**Result:** CLI flag value overrides config file, schema, and code defaults for that option.

## Summary Table

| Source                | Used by | Precedence |
|-----------------------|---------|------------|
| CLI flags             | CLI     | 1 (highest)|
| CLI config file       | CLI     | 2          |
| UI form values        | UI      | 1 (highest)|
| UI config file        | UI      | 2          |
| Schema defaults       | Both    | 3          |
| Code defaults         | CLI     | 4 (lowest) |

## Best Practices

- Keep schema and code defaults in sync for clarity.
- Use config generators (`init` command or UI panel) to create config files.
- Document any changes to config options and precedence in this file.
# �️ CLI & UI Configuration Separation and Schema

TestCopilot uses separate config files for CLI and UI, but both validate and apply defaults using a shared schema:

- **CLI config:** `testcopilot.config.json` (used by CLI commands)
- **UI config:** `testcopilot.ui.config.json` (used by the future UI)
- **Shared schema:** `testcopilot.config.schema.json` (used for validation and default values)

### How It Works

- Both CLI and UI load their own config file, allowing users to have different settings for each.
- The shared schema defines all available options and their default values, ensuring consistency.
- If a config file is missing or incomplete, defaults from the schema are applied automatically.
- Config files are never overwritten by the other tool (UI does not overwrite CLI config, and vice versa).

### Adding New Options

- Update `testcopilot.config.schema.json` with new options and defaults.
- Update CLI and UI config generators to use the new schema.

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

### Best Practices

- Always validate config files against the shared schema.
- Use the CLI or UI config generator to create new config files.
- Document any changes to config options in this file.
# �🛠️ TestCopilot Configuration Strategy

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
    "raceConditionAnalysis": true,
    "thenNesting": true,
    "assertionAnalysis": true,
    "brittleSelectors": true,
    "longChains": true,
    "longTestStructure": true,
    "redundantShoulds": true,
    "falseConfidence": true,
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
--disable-checker=raceConditionAnalysis
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
