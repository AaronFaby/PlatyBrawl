import { LOGICAL_W, STAGE_PAD, STAGE_W } from '../config.ts'
import type { Fighter } from '../fight/types.ts'

export type Cam = { x: number; y: number }

const MARGIN = 72

export function createCam(): Cam {
  return { x: (STAGE_W - LOGICAL_W) / 2, y: 0 }
}

/** Street Fighter-style: only scroll when someone pushes the edge. Idle P1 stays planted. */
export function updateCam(cam: Cam, a: Fighter, b: Fighter): void {
  const left = Math.min(a.x, b.x)
  const right = Math.max(a.x, b.x)
  const max = STAGE_W - LOGICAL_W
  const margin = Math.min(MARGIN, (LOGICAL_W - (right - left)) / 2)
  let x = cam.x
  if (left < x + margin) x = left - margin
  if (right > x + LOGICAL_W - margin) x = right - (LOGICAL_W - margin)
  if (x < 0) x = 0
  if (x > max) x = max
  cam.x += (x - cam.x) * 0.25
  cam.x = Math.max(0, right + STAGE_PAD - LOGICAL_W, Math.min(max, left - STAGE_PAD, cam.x))
}
