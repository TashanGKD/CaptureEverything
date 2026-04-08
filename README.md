# Midscene Web Capture

Cross-platform web page capture tooling built on top of Midscene bridge mode.

## What it does

- Opens a target URL in your local Chrome/Edge with the Midscene extension enabled
- Resets the viewport before the first capture when the active adapter supports it
- Captures pages into `./screenshot/<beijing-task-time>/`
- Names images in sequence: `01.jpg`, `02.jpg`, ...
- Applies an initial overlap calibration so later captures use a corrected scroll distance

## Requirements

- Node.js 20+
- Python 3.10+
- Chrome or Edge with the Midscene extension installed and enabled
- A working Midscene model configuration in `.env`

## Install

```bash
npm install
python -m pip install -r requirements.txt
cp .env.example .env
```

Fill in `.env` with your model config.

## Usage

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

`meta.json` includes the detected layout, the calibrated scroll distance, and the saved file paths.

## Notes

- The tool is intentionally not Windows-specific. The entrypoints are standard Node.js and Python files.
- The current default adapter is optimized for canvas-based grid pages.
- If you need to support another page family, update the adapter logic in `scripts/capture_web_pages.mjs`.
