from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent


def run_bridge(
    prompt: str,
    *,
    mode: str = "new-tab",
    url: str | None = None,
    assertion: str | None = None,
    timeout_ms: int = 60000,
    keep_open: bool = False,
) -> subprocess.CompletedProcess[str]:
    command = [
        "node",
        str(ROOT / "scripts" / "midscene_bridge_runner.mjs"),
        "--mode",
        mode,
        "--prompt",
        prompt,
        "--timeout-ms",
        str(timeout_ms),
    ]

    if url:
        command.extend(["--url", url])

    if assertion:
        command.extend(["--assert", assertion])

    if keep_open:
        command.append("--keep-open")

    return subprocess.run(
        command,
        cwd=ROOT,
        check=False,
        text=True,
        capture_output=True,
    )


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Call Midscene bridge mode from Python."
    )
    parser.add_argument(
        "--prompt",
        required=True,
        help='Natural-language instruction, for example: type "AI 101" and hit Enter',
    )
    parser.add_argument(
        "--mode",
        choices=("new-tab", "current-tab"),
        default="new-tab",
        help="Connect a fresh tab or attach to the active tab.",
    )
    parser.add_argument(
        "--url",
        default="https://www.bing.com",
        help="Only used in new-tab mode.",
    )
    parser.add_argument(
        "--assertion",
        help='Optional assertion, for example: there are some search results',
    )
    parser.add_argument(
        "--timeout-ms",
        type=int,
        default=60000,
        help="How long to wait for the extension to accept the bridge connection.",
    )
    parser.add_argument(
        "--keep-open",
        action="store_true",
        help="Keep the created tab open after the script exits.",
    )
    return parser


def main() -> int:
  parser = build_parser()
  args = parser.parse_args()

  result = run_bridge(
      prompt=args.prompt,
      mode=args.mode,
      url=args.url if args.mode == "new-tab" else None,
      assertion=args.assertion,
      timeout_ms=args.timeout_ms,
      keep_open=args.keep_open,
  )

  if result.stdout:
      print(result.stdout, end="")

  if result.stderr:
      print(result.stderr, end="", file=sys.stderr)

  return result.returncode


if __name__ == "__main__":
    raise SystemExit(main())
