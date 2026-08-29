#!/usr/bin/env python3
"""Chroma-key green sprites and pack them to uniform cells.

Usage:
  python3 scripts/process_sprites.py --src /path/to/source/images
  python3 scripts/process_sprites.py --src ./art --map scripts/sprite_map.json
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "sprites"
STAGE_OUT = ROOT / "public" / "stage"
DEFAULT_MAP = Path(__file__).resolve().parent / "sprite_map.json"
CELL = 160


def key_green(im: Image.Image) -> Image.Image:
    im = im.convert("RGBA")
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if g > 170 and r < 130 and b < 130:
                px[x, y] = (0, 0, 0, 0)
            elif g > 140 and g > r + 25 and g > b + 25:
                alpha = max(0, 255 - (g - max(r, b)) * 3)
                px[x, y] = (r, g, b, alpha)
    return im


def pack_cell(im: Image.Image, size: int = CELL) -> Image.Image:
    bbox = im.getbbox()
    if not bbox:
        return Image.new("RGBA", (size, size), (0, 0, 0, 0))
    cropped = im.crop(bbox)
    cw, ch = cropped.size
    scale = min((size - 8) / cw, (size - 8) / ch)
    nw, nh = max(1, int(cw * scale)), max(1, int(ch * scale))
    cropped = cropped.resize((nw, nh), Image.Resampling.NEAREST)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.paste(cropped, ((size - nw) // 2, size - nh - 4), cropped)
    return canvas


def save_sprite(src: Path, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    pack_cell(key_green(Image.open(src))).save(dest)


def save_portrait(src: Path, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    im = Image.open(src).convert("RGBA")
    im = im.resize((128, 128), Image.Resampling.NEAREST)
    im.save(dest)


def save_stage(src: Path, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    im = Image.open(src).convert("RGB")
    im = im.resize((960, 540), Image.Resampling.BICUBIC)
    im.save(dest, quality=90)


def load_map(path: Path) -> dict:
    data = json.loads(path.read_text())
    for key in ("sprites", "portraits", "stages"):
        if key not in data or not isinstance(data[key], list):
            raise SystemExit(f"sprite map {path} is missing list '{key}'")
    return data


def resolve(src_dir: Path, name: str) -> Path:
    p = src_dir / name
    if not p.is_file():
        raise SystemExit(f"missing source image: {p}")
    return p


def main() -> None:
    parser = argparse.ArgumentParser(description="Key and pack fighter sprites / portraits / stages.")
    parser.add_argument("--src", required=True, type=Path, help="Directory of source images")
    parser.add_argument("--map", type=Path, default=DEFAULT_MAP, help="JSON map of src filename -> dest")
    args = parser.parse_args()
    src_dir = args.src.expanduser().resolve()
    if not src_dir.is_dir():
        raise SystemExit(f"--src is not a directory: {src_dir}")
    mapping = load_map(args.map.resolve())

    for src_name, dest in mapping["sprites"]:
        save_sprite(resolve(src_dir, src_name), OUT / dest)
        print("sprite", dest)
    for src_name, dest in mapping["portraits"]:
        save_portrait(resolve(src_dir, src_name), OUT / dest)
        print("portrait", dest)
    for src_name, dest in mapping["stages"]:
        save_stage(resolve(src_dir, src_name), STAGE_OUT / dest)
        print("stage", dest)
    print("done")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)
