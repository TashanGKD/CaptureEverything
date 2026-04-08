from __future__ import annotations

import json
import sys
from pathlib import Path

import cv2


def main() -> int:
    if len(sys.argv) != 9:
        raise SystemExit(
            "Usage: compute_overlap_offset.py <prev> <current> <x1> <x2> <template_top> <template_bottom> <search_top> <search_bottom>"
        )

    prev_path = Path(sys.argv[1])
    current_path = Path(sys.argv[2])
    x1 = int(sys.argv[3])
    x2 = int(sys.argv[4])
    template_top = int(sys.argv[5])
    template_bottom = int(sys.argv[6])
    search_top = int(sys.argv[7])
    search_bottom = int(sys.argv[8])

    prev = cv2.imread(str(prev_path))
    current = cv2.imread(str(current_path))

    if prev is None or current is None:
        raise SystemExit("Failed to read input images.")

    template = prev[template_top:template_bottom, x1:x2]
    search = current[search_top:search_bottom, x1:x2]

    if template.size == 0 or search.size == 0:
        raise SystemExit("Computed template/search regions are empty.")

    result = cv2.matchTemplate(search, template, cv2.TM_CCOEFF_NORMED)
    _, max_val, _, max_loc = cv2.minMaxLoc(result)
    best_top = search_top + max_loc[1]

    print(
        json.dumps(
            {
                "best_top_px": int(best_top),
                "match_score": float(max_val),
                "template_height": int(template.shape[0]),
                "template_width": int(template.shape[1]),
            }
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

