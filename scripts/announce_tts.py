#!/usr/bin/env python3
"""Generate arcade callout clips via xAI TTS (Zagan at 1.5x)."""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

API = "https://api.x.ai/v1/tts"
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "announce"

CLIPS = [
    ("first-strike.mp3", "<shout>First strike!</shout>"),
    ("counter.mp3", "<shout>Counter!</shout>"),
    ("reversal.mp3", "<shout>Reversal!</shout>"),
    ("excellent.mp3", "<shout>Excellent!</shout>"),
    ("perfect.mp3", "<shout>Perfect!</shout>"),
    ("double-ko.mp3", "<shout>Double kay-oh!</shout>"),
]


def looks_like_audio(data: bytes) -> bool:
    if len(data) < 2000:
        return False
    if data[:3] == b"ID3" or data[:2] == b"\xff\xfb" or data[:2] == b"\xff\xf3":
        return True
    # MPEG sync can sit a few bytes in; reject JSON/HTML for sure.
    if data.lstrip()[:1] in (b"{", b"<"):
        return False
    return data[0] == 0xFF


def synthesize(text: str, key: str) -> bytes:
    body = json.dumps(
        {
            "text": text,
            "voice_id": "zagan",
            "language": "en",
            "speed": 1.5,
            "output_format": {
                "codec": "mp3",
                "sample_rate": 44100,
                "bit_rate": 192000,
            },
        }
    ).encode()
    req = urllib.request.Request(
        API,
        data=body,
        headers={
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    last = None
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=90) as res:
                data = res.read()
            if not looks_like_audio(data):
                preview = data[:180].decode("utf-8", "replace")
                raise RuntimeError(f"not audio ({len(data)} bytes): {preview}")
            return data
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, RuntimeError) as e:
            last = e
            if isinstance(e, urllib.error.HTTPError):
                err_body = e.read()[:300].decode("utf-8", "replace")
                last = RuntimeError(f"HTTP {e.code}: {err_body}")
            print(f"  retry {attempt + 1}/3: {last}", file=sys.stderr)
    raise SystemExit(f"TTS failed for {text!r}: {last}")


def write_clip(name: str, text: str, key: str) -> str:
    data = synthesize(text, key)
    dest = OUT / name
    dest.write_bytes(data)
    return f"{name}: {len(data):,} bytes"


def main() -> None:
    key = os.environ.get("XAI_API_KEY")
    if not key:
        sys.exit("XAI_API_KEY is not set")
    OUT.mkdir(parents=True, exist_ok=True)
    with ThreadPoolExecutor(max_workers=6) as pool:
        jobs = [pool.submit(write_clip, name, text, key) for name, text in CLIPS]
        for fut in as_completed(jobs):
            print(fut.result())


if __name__ == "__main__":
    main()
