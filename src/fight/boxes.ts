import type { Box, Facing } from './types.ts'

export function rect(x: number, y: number, w: number, h: number): Box {
  return { x, y, w, h }
}

export function overlaps(a: Box, b: Box): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

/** Local +x is toward facing. Local origin is the feet. +y is down. */
export function worldBox(box: Box, x: number, y: number, facing: Facing): Box {
  const wx = facing === 1 ? x + box.x : x - box.x - box.w
  return { x: wx, y: y + box.y, w: box.w, h: box.h }
}

export function flipDir(dir: number): number {
  const table: Record<number, number> = { 1: 3, 3: 1, 4: 6, 6: 4, 7: 9, 9: 7 }
  return table[dir] ?? dir
}

export function faceRel(worldDir: number, facing: Facing): number {
  return facing === 1 ? worldDir : flipDir(worldDir)
}

export function dirFromAxes(h: number, v: number): number {
  const hh = h < 0 ? -1 : h > 0 ? 1 : 0
  const vv = v < 0 ? -1 : v > 0 ? 1 : 0
  return 5 + hh + vv * 3
}

export function overlapCenter(a: Box, b: Box): { x: number; y: number } {
  const x1 = Math.max(a.x, b.x)
  const y1 = Math.max(a.y, b.y)
  const x2 = Math.min(a.x + a.w, b.x + b.w)
  const y2 = Math.min(a.y + a.h, b.y + b.h)
  return { x: (x1 + x2) / 2, y: (y1 + y2) / 2 }
}
