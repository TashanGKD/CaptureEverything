import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AgentOverChromeBridge } from '@midscene/web/bridge-mode';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const PYTHON_HELPER = path.join(__dirname, 'compute_overlap_offset.py');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function parseArgs(argv) {
  const options = {
    url: '',
    shots: 10,
    outputDir: 'screenshot',
    waitMs: 8000,
    timeoutMs: 30000,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    const next = argv[index + 1];

    if (current === '--url' && next) {
      options.url = next;
      index += 1;
      continue;
    }

    if (current === '--shots' && next) {
      options.shots = Number(next);
      index += 1;
      continue;
    }

    if (current === '--output-dir' && next) {
      options.outputDir = next;
      index += 1;
      continue;
    }

    if (current === '--wait-ms' && next) {
      options.waitMs = Number(next);
      index += 1;
      continue;
    }

    if (current === '--timeout-ms' && next) {
      options.timeoutMs = Number(next);
      index += 1;
      continue;
    }
  }

  if (!options.url) {
    throw new Error('Missing required argument: --url');
  }

  if (!Number.isFinite(options.shots) || options.shots <= 0) {
    throw new Error('`--shots` must be a positive integer.');
  }

  return options;
}

function parseDataUrl(dataUrl) {
  const matched = String(dataUrl).match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!matched) {
    throw new Error('Unexpected screenshot format returned by bridge mode.');
  }

  return {
    mimeType: matched[1],
    base64: matched[2],
  };
}

async function saveScreenshot(agent, outputPath) {
  const { base64 } = parseDataUrl(await agent.page.screenshotBase64());
  await fs.writeFile(outputPath, Buffer.from(base64, 'base64'));
}

function getTaskFolderName() {
  const formatter = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = Object.fromEntries(
    formatter
      .formatToParts(new Date())
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  );

  return `${parts.year}${parts.month}${parts.day}_${parts.hour}${parts.minute}${parts.second}`;
}

async function evaluateJson(agent, script) {
  const result = await agent.page.evaluateJavaScript(`JSON.stringify((${script})())`);
  const jsonString = result?.result?.value || result;
  return JSON.parse(jsonString);
}

function createPageAdapter() {
  return {
    appObjectPath: 'window.SpreadsheetApp',
    async detectLayout(agent) {
      return evaluateJson(
        agent,
        `() => {
          const canvases = Array.from(document.querySelectorAll('canvas')).map((el) => {
            const rect = el.getBoundingClientRect();
            return {
              width: Math.round(rect.width),
              height: Math.round(rect.height),
              top: Math.round(rect.top),
              left: Math.round(rect.left),
              right: Math.round(rect.right),
              bottom: Math.round(rect.bottom),
              className: typeof el.className === 'string' ? el.className : '',
              id: el.id || '',
            };
          }).filter((item) => item.width > 0 && item.height > 0);

          const mainCanvas = canvases
            .filter((item) => item.width >= window.innerWidth * 0.8 && item.height >= window.innerHeight * 0.5)
            .sort((a, b) => (b.width * b.height) - (a.width * a.height))[0] || null;

          const headerCanvas = canvases
            .filter((item) =>
              item.width >= window.innerWidth * 0.8 &&
              item.height >= 20 &&
              item.height <= 80 &&
              item.top >= 150 &&
              item.top <= window.innerHeight &&
              item.left >= 0
            )
            .sort((a, b) => a.top - b.top)[0] || null;

          return {
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
            devicePixelRatio: window.devicePixelRatio,
            mainCanvas,
            headerCanvas,
          };
        }`,
      );
    },
    deriveScrollPlan(layoutMetrics) {
      if (!layoutMetrics.mainCanvas) {
        throw new Error('Failed to locate the main content canvas.');
      }

      const main = layoutMetrics.mainCanvas;
      const header = layoutMetrics.headerCanvas;
      const rowHeight = header?.height || 29;
      const firstRowTop = header?.bottom || (main.top + rowHeight);
      const viewportBottom = main.bottom;
      const fullyVisibleRowCount = Math.floor((viewportBottom - firstRowTop) / rowHeight);

      if (fullyVisibleRowCount < 2) {
        throw new Error('Not enough fully visible rows to compute overlap scrolling.');
      }

      return {
        gridLeft: Math.max(main.left, 0),
        gridRight: Math.max(main.right, Math.min(layoutMetrics.viewportWidth, main.right || layoutMetrics.viewportWidth)),
        firstRowTop,
        rowHeight,
        viewportBottom,
        fullyVisibleRowCount,
        scrollDistance: (fullyVisibleRowCount - 1) * rowHeight,
      };
    },
    async focusAndReset(agent, layoutMetrics, scrollPlan) {
      const clickX = Math.round(Math.max(200, layoutMetrics.mainCanvas.left + 250));
      const clickY = Math.round(scrollPlan.firstRowTop + 120);

      await agent.page.mouse.click(clickX, clickY);
      await sleep(500);
      await agent.page.keyboard.press([{ key: 'Control' }, { key: 'Home' }]);
      await sleep(2500);
    },
    async scroll(agent, pixelDistance) {
      const result = await agent.page.evaluateJavaScript(`(() => {
        ${this.appObjectPath}.view.canvas.scrollApi.scrollByPixel(
          { diffY: ${JSON.stringify(pixelDistance)}, areaY: 'flow' },
          false
        );
        return true;
      })()`);

      if (result?.exceptionDetails) {
        throw new Error(`Failed to scroll viewport: ${result.result?.description || 'unknown error'}`);
      }

      await sleep(1200);
    },
  };
}

function computeAlignmentConfig(layoutMetrics, scrollPlan, imageHeight, imageWidth) {
  const scale = imageHeight / layoutMetrics.viewportHeight;
  const dataTopPx = Math.round(scrollPlan.firstRowTop * scale);
  const dataBottomPx = Math.round(scrollPlan.viewportBottom * scale);
  const x1 = Math.max(0, Math.round((scrollPlan.gridLeft + 60) * scale));
  const x2 = Math.min(imageWidth, Math.round((scrollPlan.gridRight - 20) * scale));
  const templateTop = Math.max(dataTopPx + 120, dataBottomPx - 220);
  const templateBottom = Math.max(templateTop + 40, dataBottomPx - 90);
  const searchTop = Math.max(0, dataTopPx - 20);
  const searchBottom = Math.min(imageHeight, dataTopPx + 320);

  return {
    scale,
    expectedTopPx: dataTopPx,
    x1,
    x2,
    templateTop,
    templateBottom,
    searchTop,
    searchBottom,
  };
}

function runPython(args) {
  const result = spawnSync('python', args, {
    cwd: PROJECT_ROOT,
    encoding: 'utf-8',
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || 'Python helper failed.');
  }

  return result.stdout.trim();
}

function inspectImage(imagePath) {
  const output = runPython([
    '-c',
    [
      'from PIL import Image; import json, sys;',
      'img = Image.open(sys.argv[1]);',
      'print(json.dumps({"width": img.width, "height": img.height}))',
    ].join(' '),
    imagePath,
  ]);

  return JSON.parse(output);
}

function runAlignment(previousPath, currentPath, alignment) {
  const output = runPython([
    PYTHON_HELPER,
    previousPath,
    currentPath,
    String(alignment.x1),
    String(alignment.x2),
    String(alignment.templateTop),
    String(alignment.templateBottom),
    String(alignment.searchTop),
    String(alignment.searchBottom),
  ]);

  const payload = JSON.parse(output);
  return {
    ...payload,
    offsetPx: payload.best_top_px - alignment.expectedTopPx,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const rootOutputDir = path.resolve(PROJECT_ROOT, options.outputDir);
  await fs.mkdir(rootOutputDir, { recursive: true });

  const taskFolderName = getTaskFolderName();
  const outputDir = path.join(rootOutputDir, taskFolderName);
  await fs.mkdir(outputDir, { recursive: true });

  const metaPath = path.join(outputDir, 'meta.json');
  const probePath = path.join(outputDir, '_probe.jpg');
  const pageAdapter = createPageAdapter();

  const agent = new AgentOverChromeBridge({
    closeNewTabsAfterDisconnect: false,
  });

  try {
    await agent.connectNewTabWithUrl(options.url, { timeout: options.timeoutMs });
    await sleep(options.waitMs);

    const layoutMetrics = await pageAdapter.detectLayout(agent);
    const scrollPlan = pageAdapter.deriveScrollPlan(layoutMetrics);
    await pageAdapter.focusAndReset(agent, layoutMetrics, scrollPlan);

    const screenshots = [];
    const calibrations = [];
    let calibratedScrollDistance = scrollPlan.scrollDistance;

    for (let index = 1; index <= options.shots; index += 1) {
      const outputPath = path.join(outputDir, `${String(index).padStart(2, '0')}.jpg`);

      if (index === 1) {
        await saveScreenshot(agent, outputPath);
        screenshots.push(outputPath);
        continue;
      }

      if (index === 2) {
        await pageAdapter.scroll(agent, calibratedScrollDistance);
        await saveScreenshot(agent, probePath);

        const imageSize = inspectImage(probePath);
        const alignment = computeAlignmentConfig(
          layoutMetrics,
          scrollPlan,
          imageSize.height,
          imageSize.width,
        );
        const calibration = runAlignment(screenshots[screenshots.length - 1], probePath, alignment);

        calibrations.push({ index, alignment, calibration });

        const correctionViewport = Math.round(calibration.offsetPx / alignment.scale);
        calibratedScrollDistance += correctionViewport;

        if (Math.abs(correctionViewport) > 0) {
          await pageAdapter.scroll(agent, correctionViewport);
        }

        await saveScreenshot(agent, outputPath);
        screenshots.push(outputPath);
        continue;
      }

      await pageAdapter.scroll(agent, calibratedScrollDistance);
      await saveScreenshot(agent, outputPath);
      screenshots.push(outputPath);
    }

    await fs.rm(probePath, { force: true });

    const metadata = {
      url: options.url,
      shots: options.shots,
      taskFolderName,
      outputDir,
      screenshots,
      layoutMetrics,
      scrollPlan,
      calibratedScrollDistance,
      calibrations,
      adapter: {
        kind: 'canvas-grid',
      },
    };

    await fs.writeFile(metaPath, JSON.stringify(metadata, null, 2), 'utf-8');
    console.log(JSON.stringify(metadata, null, 2));
  } finally {
    await agent.destroy();
  }
}

main().catch((error) => {
  console.error(error?.stack || String(error));
  process.exitCode = 1;
});
