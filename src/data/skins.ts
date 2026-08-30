import type { CharId } from '../config.ts'

export const SKIN_COUNT = 4
export type SkinId = 0 | 1 | 2 | 3

export type SkinTune = { hue: number; sat: number; light: number }

const TUNE: Record<CharId, SkinTune[]> = {
  bob: [
    { hue: 0, sat: 1, light: 1 },
    { hue: 205, sat: 1.25, light: 0.98 },
    { hue: 318, sat: 1.3, light: 1 },
    { hue: 118, sat: 1.2, light: 0.96 },
  ],
  ninja: [
    { hue: 0, sat: 1, light: 1 },
    { hue: 210, sat: 1.15, light: 1 },
    { hue: 40, sat: 1.2, light: 1.02 },
    { hue: 280, sat: 1.15, light: 1 },
  ],
  cyber: [
    { hue: 0, sat: 1, light: 1 },
    { hue: 300, sat: 1.2, light: 1 },
    { hue: 50, sat: 1.15, light: 1 },
    { hue: 140, sat: 1.2, light: 0.98 },
  ],
  soldier: [
    { hue: 0, sat: 1, light: 1 },
    { hue: 200, sat: 1.2, light: 1 },
    { hue: 30, sat: 1.25, light: 1.02 },
    { hue: 320, sat: 1.15, light: 1 },
  ],
  chainsaw: [
    { hue: 0, sat: 1, light: 1 },
    { hue: 20, sat: 1.8, light: 1 },
    { hue: 200, sat: 1.7, light: 1 },
    { hue: 125, sat: 1.6, light: 0.98 },
  ],
  toxic: [
    { hue: 0, sat: 1, light: 1 },
    { hue: 180, sat: 1.15, light: 1 },
    { hue: 300, sat: 1.2, light: 1 },
    { hue: 20, sat: 1.25, light: 1 },
  ],
}

const tintCache = new Map<string, HTMLCanvasElement>()

export function wrapSkin(n: number): SkinId {
  return ((((n % SKIN_COUNT) + SKIN_COUNT) % SKIN_COUNT) as SkinId)
}

export function nextSkin(n: SkinId): SkinId {
  return wrapSkin(n + 1)
}

export function skinTune(id: CharId, skin: SkinId): SkinTune {
  return TUNE[id][wrapSkin(skin)] ?? TUNE[id][0]
}

export function sessionSkin(n: number | undefined): SkinId {
  return n == null ? 0 : wrapSkin(n)
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0)
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  return [h * 60, s, l]
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const hp = ((h % 360) + 360) % 360 / 60
  const x = c * (1 - Math.abs((hp % 2) - 1))
  let r = 0
  let g = 0
  let b = 0
  if (hp < 1) { r = c; g = x }
  else if (hp < 2) { r = x; g = c }
  else if (hp < 3) { g = c; b = x }
  else if (hp < 4) { g = x; b = c }
  else if (hp < 5) { r = x; b = c }
  else { r = c; b = x }
  const m = l - c / 2
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)]
}

function parseHex(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

export function shiftHex(hex: string, id: CharId, skin: SkinId): string {
  const tune = skinTune(id, skin)
  if (tune.hue === 0 && tune.sat === 1 && tune.light === 1) return hex
  const [r, g, b] = parseHex(hex)
  const [nr, ng, nb] = shiftRgb(r, g, b, tune)
  return `#${[nr, ng, nb].map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

function hueDist(a: number, b: number): number {
  const d = Math.abs(a - b) % 360
  return d > 180 ? 360 - d : d
}

function isPortraitBackdropColor(r: number, g: number, b: number, seedH: number): boolean {
  const [h, s, l] = rgbToHsl(r, g, b)
  if (l < 0.07) return true
  return hueDist(h, seedH) < 50 && s >= 0.18
}

/** 1 = keep original (purple select backdrop), 0 = tint. Floods from the top corners. */
export function portraitBackdropMask(d: Uint8ClampedArray, w: number, h: number): Uint8Array {
  const marked = new Uint8Array(w * h)
  if (w < 1 || h < 1) return marked
  const seedH = rgbToHsl(d[0], d[1], d[2])[0]
  const q = new Int32Array(w * h)
  let qh = 0
  let qt = 0
  const trySeed = (x: number, y: number) => {
    const i = y * w + x
    if (marked[i]) return
    const o = i * 4
    if (!isPortraitBackdropColor(d[o], d[o + 1], d[o + 2], seedH)) return
    marked[i] = 1
    q[qt++] = i
  }
  trySeed(0, 0)
  trySeed(w - 1, 0)
  while (qh < qt) {
    const i = q[qh++]
    const x = i % w
    const y = (i - x) / w
    if (x > 0) trySeed(x - 1, y)
    if (x < w - 1) trySeed(x + 1, y)
    if (y > 0) trySeed(x, y - 1)
    if (y < h - 1) trySeed(x, y + 1)
  }
  return marked
}

function shiftRgb(r: number, g: number, b: number, tune: SkinTune): [number, number, number] {
  const [h0, s0, l0] = rgbToHsl(r, g, b)
  if (l0 < 0.08) return [r, g, b]
  let s = s0
  if (s < 0.12 && tune.hue !== 0) s = 0.42
  s = Math.min(1, s * tune.sat)
  const l = Math.min(1, Math.max(0, l0 * tune.light))
  return hslToRgb(h0 + tune.hue, s, l)
}

export function recolorImage(img: HTMLImageElement, id: CharId, skin: SkinId, tag: string): CanvasImageSource {
  const s = wrapSkin(skin)
  if (s === 0) return img
  const key = `${id}:${tag}:${s}:${img.src}`
  const hit = tintCache.get(key)
  if (hit) return hit
  const w = img.naturalWidth || img.width
  const h = img.naturalHeight || img.height
  if (!w || !h || typeof document === 'undefined') return img
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const g = canvas.getContext('2d', { willReadFrequently: true })
  if (!g) return img
  g.drawImage(img, 0, 0)
  const pix = g.getImageData(0, 0, w, h)
  const tune = skinTune(id, s)
  const d = pix.data
  const backdrop = tag === 'portrait' ? portraitBackdropMask(d, w, h) : null
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 12) continue
    if (backdrop && backdrop[i / 4]) continue
    const [nr, ng, nb] = shiftRgb(d[i], d[i + 1], d[i + 2], tune)
    d[i] = nr
    d[i + 1] = ng
    d[i + 2] = nb
  }
  g.putImageData(pix, 0, 0)
  tintCache.set(key, canvas)
  return canvas
}
