# OpenClaw Integration

This repo can be wired into OpenClaw as a custom workspace skill so the agent
can drive a real browser tab through Midscene bridge mode.

## Why this path

This follows the same core idea as Midscene's `chrome-bridge` skill:

- keep the user's real browser session
- preserve cookies and login state
- let OpenClaw choose browser automation only when needed

## Useful links

- [Midscene skills repository](https://github.com/web-infra-dev/midscene-skills)
- [Browser skill](https://github.com/web-infra-dev/midscene-skills/tree/main/skills/browser)
- [Chrome bridge skill](https://github.com/web-infra-dev/midscene-skills/tree/main/skills/chrome-bridge)
- [OpenClaw skills docs](https://docs.openclaw.ai/tools/skills)
- [OpenClaw skills config docs](https://docs.openclaw.ai/tools/skills-config)

## Recommended OpenClaw config shape

Example `openclaw.json` snippets:

```json
{
  "models": {
    "mode": "merge",
    "providers": {
      "custom-dashscope": {
        "baseUrl": "https://coding.dashscope.aliyuncs.com/v1",
        "api": "openai-completions",
        "apiKey": "YOUR_API_KEY",
        "models": [
          {
            "id": "qwen3.5-plus",
            "name": "qwen3.5-plus",
            "contextWindow": 1000000,
            "maxTokens": 65536,
            "input": ["text", "image"],
            "reasoning": false
          }
        ]
      }
    }
  },
  "agents": {
    "defaults": {
      "model": {
        "primary": "custom-dashscope/qwen3.5-plus"
      }
    }
  },
  "gateway": {
    "mode": "local",
    "auth": {
      "mode": "token",
      "token": "YOUR_LOCAL_TOKEN"
    }
  }
}
```

Optional channel config, for example Feishu, should stay separate from the
Midscene integration itself.

## Workspace skill location

Create the skill under one of these:

- `<workspace>/skills/midscene-browser`
- `~/.openclaw/skills/midscene-browser`

The example skill file in this repo lives at:

- [skills/midscene-browser/SKILL.md](./skills/midscene-browser/SKILL.md)

## Browser prerequisites

- Chrome or Edge is running
- Midscene extension is installed
- The extension popup has already accepted bridge access

Healthy output usually includes:

- `one client connected`
- `Bridge connected, cli-side version ..., browser-side version ...`
- `Connected to current tab.`

## Suggested workflow

1. Clone this repo locally
2. Configure `.env`
3. Verify direct bridge mode works with `scripts/midscene_bridge_runner.mjs`
4. Copy or adapt the OpenClaw skill example
5. Start a new OpenClaw session or restart the gateway
6. Let OpenClaw trigger Midscene for real-browser tasks
