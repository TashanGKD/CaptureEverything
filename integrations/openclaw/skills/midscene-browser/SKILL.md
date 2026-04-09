---
name: midscene-browser
description: Use Midscene bridge mode to control a real Chrome or Edge browser tab while keeping the user's logged-in session. Trigger when the user asks to operate a site in the browser, reuse the current tab, preserve login state, or use Midscene/browser bridge automation.
metadata:
  {
    "openclaw":
      {
        "emoji": "🌐",
        "requires": { "bins": ["node"] },
      },
  }
---

# Midscene Browser

Use this skill for real-browser work that should keep the user's existing
cookies, session, and login state.

## Preconditions

- Chrome or Edge is open
- The Midscene extension is installed
- The extension already accepted bridge access
- This repo is cloned locally and `.env` is configured

## Command

Replace `<REPO_ROOT>` with your local checkout path.

Current tab:

```bash
node "<REPO_ROOT>/scripts/midscene_bridge_runner.mjs" \
  --mode current-tab \
  --prompt "<instruction>"
```

New tab:

```bash
node "<REPO_ROOT>/scripts/midscene_bridge_runner.mjs" \
  --mode new-tab \
  --url "https://example.com" \
  --prompt "<instruction>"
```

With assertion:

```bash
node "<REPO_ROOT>/scripts/midscene_bridge_runner.mjs" \
  --mode current-tab \
  --prompt "<instruction>" \
  --assert "<expected result>"
```

## Guidance

- Prefer `current-tab` when preserving state matters
- Use `new-tab` only when the user explicitly gives a URL or wants a fresh page
- Keep prompts concrete and action-oriented
- If connection fails, ask the user to open the Midscene extension and click
  `Allow connection`
