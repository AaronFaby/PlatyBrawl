import { GROUND_Y, LOGICAL_W, STAGE_PAD, STAGE_W } from '../config.ts'
import { worldBox } from './boxes.ts'
import { currentFrame, grounded } from './fighter.ts'
import type { Fighter } from './types.ts'

export function clampStage(f: Fighter): void {
  if (f.x < STAGE_PAD) {
    f.x = STAGE_PAD
    if (f.vx < 0) f.vx = 0
  }
  if (f.x > STAGE_W - STAGE_PAD) {
    f.x = STAGE_W - STAGE_PAD
    if (f.vx > 0) f.vx = 0
  }
  if (f.y > GROUND_Y) f.y = GROUND_Y
}

export function resolvePush(a: Fighter, b: Fighter): void {
  if (!grounded(a) || !grounded(b)) return
  const fa = currentFrame(a)
  const fb = currentFrame(b)
  const pa = worldBox(fa.push, a.x, a.y, a.facing)
  const pb = worldBox(fb.push, b.x, b.y, b.facing)
  const overlap = Math.min(pa.x + pa.w, pb.x + pb.w) - Math.max(pa.x, pb.x)
  if (overlap <= 0) return
  const aLeft = a.x <= b.x
  const left = aLeft ? a : b
  const right = aLeft ? b : a
  const leftAtWall = left.x <= STAGE_PAD + 0.5
  const rightAtWall = right.x >= STAGE_W - STAGE_PAD - 0.5
  if (leftAtWall && !rightAtWall) {
    right.x += overlap + 0.5
  } else if (rightAtWall && !leftAtWall) {
    left.x -= overlap + 0.5
  } else {
    const push = overlap / 2 + 0.5
    left.x -= push
    right.x += push
  }
  clampStage(a)
  clampStage(b)
}

/** Stop outward movement at the screen span without dragging a stationary opponent. */
export function clampSeparation(a: Fighter, b: Fighter, prevX: [number, number]): void {
  const left = a.x <= b.x ? a : b
  const right = left === a ? b : a
  const excess = right.x - left.x - (LOGICAL_W - 2 * STAGE_PAD)
  if (excess <= 0) return
  const leftOut = Math.max(0, prevX[left.id] - left.x)
  const rightOut = Math.max(0, right.x - prevX[right.id])
  const total = leftOut + rightOut
  const leftShare = total > 0 ? leftOut / total : 0.5
  left.x += excess * leftShare
  right.x -= excess * (1 - leftShare)
  if (left.vx < 0) left.vx = 0
  if (right.vx > 0) right.vx = 0
}
