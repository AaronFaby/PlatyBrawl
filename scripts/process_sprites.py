#!/usr/bin/env python3
"""Chroma-key green sprites and pack them to uniform cells."""

from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
IMG = Path(
    "/Users/aaronfaby/.grok/sessions/%2FUsers%2Faaronfaby%2FProjects%2FPlatyBrawl/019ff7bb-29fa-7660-9f1e-d13f1ab16369/images"
)
OUT = ROOT / "public" / "sprites"
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


def save_sprite(src_name: str, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    im = key_green(Image.open(IMG / src_name))
    pack_cell(im).save(dest)


def save_portrait(src_name: str, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    im = Image.open(IMG / src_name).convert("RGBA")
    im = im.resize((128, 128), Image.Resampling.NEAREST)
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.save(dest)


def save_stage(src_name: str, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    im = Image.open(IMG / src_name).convert("RGB")
    im = im.resize((960, 540), Image.Resampling.BICUBIC)
    im.save(dest, quality=90)


MAP: list[tuple[str, str]] = [
    # bob
    ("2.jpg", "bob/idle.png"),
    ("30.jpg", "bob/walk.png"),
    ("10.jpg", "bob/crouch.png"),
    ("8.jpg", "bob/jump.png"),
    ("5.jpg", "bob/punch.png"),
    ("6.jpg", "bob/kick.png"),
    ("7.jpg", "bob/hurt.png"),
    ("12.jpg", "bob/win.png"),
    ("11.jpg", "bob/special1.png"),
    ("15.jpg", "bob/special2.png"),
    # ninja
    ("1.jpg", "ninja/idle.png"),
    ("33.jpg", "ninja/walk.png"),
    ("13.jpg", "ninja/crouch.png"),
    ("22.jpg", "ninja/jump.png"),
    ("16.jpg", "ninja/punch.png"),
    ("14.jpg", "ninja/kick.png"),
    ("21.jpg", "ninja/hurt.png"),
    ("20.jpg", "ninja/win.png"),
    ("17.jpg", "ninja/special1.png"),
    ("18.jpg", "ninja/special2.png"),
    # cyber
    ("3.jpg", "cyber/idle.png"),
    ("35.jpg", "cyber/walk.png"),
    ("28.jpg", "cyber/crouch.png"),
    ("23.jpg", "cyber/jump.png"),
    ("19.jpg", "cyber/punch.png"),
    ("26.jpg", "cyber/kick.png"),
    ("27.jpg", "cyber/hurt.png"),
    ("29.jpg", "cyber/win.png"),
    ("24.jpg", "cyber/special1.png"),
    ("25.jpg", "cyber/special2.png"),
]


def main() -> None:
    for src, dest in MAP:
        save_sprite(src, OUT / dest)
        print("sprite", dest)
    save_portrait("31.jpg", OUT / "bob/portrait.png")
    save_portrait("32.jpg", OUT / "ninja/portrait.png")
    save_portrait("34.jpg", OUT / "cyber/portrait.png")
    save_stage("9.jpg", ROOT / "public" / "stage" / "billabong.jpg")
    print("done")


if __name__ == "__main__":
    main()
