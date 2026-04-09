# CaptureEverything

Cross-platform Midscene browser automation and page capture tooling, with an
OpenClaw integration path for real-browser control.

## What is in this repo

- `scripts/capture_web_pages.mjs`
  Batch capture for long, scrollable web pages
- `scripts/midscene_bridge_runner.mjs`
  Direct Midscene bridge-mode entrypoint for browser actions/assertions
- `scripts/midscene_bridge.py`
  Python wrapper around the Node bridge runner
- `scripts/midscene_bridge.sh`
  POSIX shell wrapper for macOS/Linux
- `integrations/openclaw/`
  OpenClaw-oriented config notes and a reusable skill example

## Upstream references

- [Midscene skills repository](https://github.com/web-infra-dev/midscene-skills)
- [Midscene browser skill](https://github.com/web-infra-dev/midscene-skills/tree/main/skills/browser)
- [Midscene chrome-bridge skill](https://github.com/web-infra-dev/midscene-skills/tree/main/skills/chrome-bridge)
- [OpenClaw skills docs](https://docs.openclaw.ai/tools/skills)
- [OpenClaw skills config docs](https://docs.openclaw.ai/tools/skills-config)
- [OpenClaw config CLI docs](https://docs.openclaw.ai/cli/config)

## Tested setup

This repo has been validated with:

- Midscene bridge mode connected to a real Edge tab
- OpenClaw local gateway mode
- A custom OpenAI-compatible model provider pointed at DashScope coding endpoint
- Optional Feishu channel wiring on the OpenClaw side

The important architectural choice is:

- Use Midscene `chrome-bridge` when you want the user's real browser state,
  cookies, and active login session
- Use the page capture script when you want repeatable screenshots from a target
  URL

## Requirements

- Node.js 20+
- Python 3.10+
- Chrome or Edge with the Midscene extension installed
- Midscene extension bridge access already allowed in the browser
- A working Midscene model configuration in `.env`

## Install

```bash
npm install
python -m pip install -r requirements.txt
cp .env.example .env
```

Fill in `.env` with your model configuration.

## Environment config

Minimal variables:

```dotenv
MIDSCENE_MODEL_BASE_URL="https://your-compatible-endpoint/v1"
MIDSCENE_MODEL_API_KEY="your-api-key"
MIDSCENE_MODEL_NAME="your-model-name"
MIDSCENE_MODEL_FAMILY="your-model-family"
MIDSCENE_MODEL_REASONING_ENABLED="false"
```

Known-good family examples:

- `qwen3.5`
- `openai`
- `claude`

For DashScope coding-compatible endpoints, a typical shape is:

```dotenv
MIDSCENE_MODEL_BASE_URL="https://coding.dashscope.aliyuncs.com/v1"
MIDSCENE_MODEL_NAME="qwen3.5-plus"
MIDSCENE_MODEL_FAMILY="qwen3.5"
MIDSCENE_MODEL_REASONING_ENABLED="false"
```

## Bridge mode usage

### Node.js

Reuse the active browser tab:

```bash
node ./scripts/midscene_bridge_runner.mjs \
  --mode current-tab \
  --prompt "click the search box and type hello"
```

Open a new tab:

```bash
node ./scripts/midscene_bridge_runner.mjs \
  --mode new-tab \
  --url "https://example.com" \
  --prompt "summarize the page"
```

Add an assertion:

```bash
node ./scripts/midscene_bridge_runner.mjs \
  --mode current-tab \
  --prompt "search for Midscene" \
  --assert "the page shows search results"
```

### Python

```bash
python ./scripts/midscene_bridge.py \
  --mode current-tab \
  --prompt "click the search box and type hello"
```

### macOS/Linux shell

```bash
bash ./scripts/midscene_bridge.sh \
  --mode current-tab \
  --prompt "click the search box and type hello"
```

## Page capture usage

```bash
npm run capture -- --url "https://example.com/your/page" --shots 10
```

Optional arguments:

- `--output-dir screenshot`
- `--wait-ms 8000`
- `--timeout-ms 30000`

## Output

Example output:

```text
screenshot/
  20260408_224300/
    01.jpg
    02.jpg
    ...
    10.jpg
    meta.json
```

`meta.json` includes the detected layout, calibrated scroll distance, and saved
file paths.

## OpenClaw integration

See [integrations/openclaw/README.md](./integrations/openclaw/README.md).

In short:

1. Keep this repo checked out locally
2. Point an OpenClaw custom skill at `scripts/midscene_bridge_runner.mjs`
3. Let OpenClaw trigger Midscene only for real-browser tasks

## Browser connection notes

Bridge mode is considered healthy when you see output like:

- `one client connected`
- `Bridge connected, cli-side version ..., browser-side version ...`
- `Connected to current tab.`

If connection fails:

- Open the target page in Chrome or Edge
- Open the Midscene extension popup
- Click `Allow connection`
- Retry once

## Notes

- The repo is intentionally not Windows-only
- The Node runner is the source of truth; Python and shell wrappers are thin
  frontends
- The OpenClaw integration should live in workspace skills rather than inside
  the OpenClaw npm install directory
