#!/usr/bin/env python3
"""Generate responsive WebP variants for portfolio photographs.

Requires Pillow. Original images remain untouched; the script creates `-480.webp`
and `-960.webp` variants when the source is wider than those breakpoints.
"""
from __future__ import annotations

from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
IMAGE_ROOT = ROOT / "assets/images"
WIDTHS = (480, 960)


def is_original(path: Path) -> bool:
    return path.suffix.lower() == ".webp" and not any(path.stem.endswith(f"-{width}") for width in WIDTHS)


def main() -> None:
    created = 0
    for source in sorted(path for path in IMAGE_ROOT.rglob("*.webp") if is_original(path)):
        with Image.open(source) as image:
            image.load()
            width, height = image.size
            for target_width in WIDTHS:
                if width <= target_width:
                    continue
                target_height = round(height * target_width / width)
                destination = source.with_name(f"{source.stem}-{target_width}.webp")
                resized = image.resize((target_width, target_height), Image.Resampling.LANCZOS)
                resized.save(destination, "WEBP", quality=86, method=6)
                created += 1
                print(f"{destination.relative_to(ROOT)} ({target_width}x{target_height})")
    print(f"Generated {created} responsive image variants.")


if __name__ == "__main__":
    main()
