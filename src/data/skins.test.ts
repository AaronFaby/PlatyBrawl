import { describe, expect, it } from 'vitest'
import { CHAR_IDS } from '../config.ts'
import { nextSkin, portraitBackdropMask, sessionSkin, shiftHex, SKIN_COUNT, skinTune, wrapSkin } from './skins.ts'

describe('skins', () => {
  it('wraps costume indices to four slots', () => {
    expect(wrapSkin(0)).toBe(0)
    expect(wrapSkin(3)).toBe(3)
    expect(wrapSkin(4)).toBe(0)
    expect(nextSkin(3)).toBe(0)
    expect(sessionSkin(undefined)).toBe(0)
  })

  it('keeps skin 0 as the authored color', () => {
    expect(shiftHex('#f0d8a8', 'bob', 0)).toBe('#f0d8a8')
  })

  it('shifts later costumes away from the default', () => {
    const base = '#f0d8a8'
    for (let s = 1; s < SKIN_COUNT; s++) {
      expect(shiftHex(base, 'bob', wrapSkin(s))).not.toBe(base)
    }
  })

  it('defines four tunes for every roster id', () => {
    for (const id of CHAR_IDS) {
      for (let s = 0; s < SKIN_COUNT; s++) {
        const t = skinTune(id, wrapSkin(s))
        expect(t.sat).toBeGreaterThan(0)
      }
    }
  })

  it('keeps a purple select backdrop and tints the fighter', () => {
    const w = 8
    const h = 8
    const d = new Uint8ClampedArray(w * h * 4)
    const put = (x: number, y: number, r: number, g: number, b: number) => {
      const o = (y * w + x) * 4
      d[o] = r
      d[o + 1] = g
      d[o + 2] = b
      d[o + 3] = 255
    }
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) put(x, y, 90, 20, 130)
    }
    for (let y = 2; y <= 5; y++) {
      for (let x = 2; x <= 5; x++) put(x, y, 240, 216, 168)
    }
    put(0, 6, 64, 58, 40)
    const mask = portraitBackdropMask(d, w, h)
    expect(mask[0]).toBe(1)
    expect(mask[3]).toBe(1)
    expect(mask[2 + 2 * w]).toBe(0)
    expect(mask[6 * w]).toBe(0)
  })
})
