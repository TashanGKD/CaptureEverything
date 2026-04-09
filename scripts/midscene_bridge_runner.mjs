import 'dotenv/config';
import { AgentOverChromeBridge } from '@midscene/web/bridge-mode';

function requireEnv(name) {
  if (!process.env[name]) {
    throw new Error(`Missing environment variable: ${name}`);
  }
}

function parseArgs(argv) {
  const options = {
    mode: 'new-tab',
    url: '',
    prompt: '',
    assert: '',
    timeoutMs: 60000,
    keepOpen: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    const next = argv[index + 1];

    if (current === '--mode' && next) {
      options.mode = next;
      index += 1;
      continue;
    }

    if (current === '--url' && next) {
      options.url = next;
      index += 1;
      continue;
    }

    if (current === '--prompt' && next) {
      options.prompt = next;
      index += 1;
      continue;
    }

    if (current === '--assert' && next) {
      options.assert = next;
      index += 1;
      continue;
    }

    if (current === '--timeout-ms' && next) {
      options.timeoutMs = Number(next);
      index += 1;
      continue;
    }

    if (current === '--keep-open') {
      options.keepOpen = true;
    }
  }

  return options;
}

async function main() {
  requireEnv('MIDSCENE_MODEL_BASE_URL');
  requireEnv('MIDSCENE_MODEL_API_KEY');
  requireEnv('MIDSCENE_MODEL_NAME');
  requireEnv('MIDSCENE_MODEL_FAMILY');

  const options = parseArgs(process.argv.slice(2));
  const agent = new AgentOverChromeBridge({
    closeNewTabsAfterDisconnect: !options.keepOpen,
  });

  try {
    if (options.mode === 'current-tab') {
      await agent.connectCurrentTab({
        timeout: options.timeoutMs,
      });
      console.log('Connected to current tab.');
    } else {
      if (!options.url) {
        throw new Error('`--url` is required when mode is `new-tab`.');
      }

      await agent.connectNewTabWithUrl(options.url, {
        timeout: options.timeoutMs,
      });
      console.log(`Connected to new tab: ${options.url}`);
    }

    if (options.prompt) {
      const actionResult = await agent.aiAct(options.prompt);
      console.log(JSON.stringify({ ok: true, type: 'action', data: actionResult }, null, 2));
    }

    if (options.assert) {
      await agent.aiAssert(options.assert);
      console.log(JSON.stringify({ ok: true, type: 'assert', data: options.assert }, null, 2));
    }
  } finally {
    await agent.destroy();
  }
}

main().catch((error) => {
  console.error(error?.stack || String(error));
  process.exitCode = 1;
});
