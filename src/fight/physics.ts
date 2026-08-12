import { GROUND_Y, STAGE_PAD, STAGE_W } from '../config.ts'
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
  if (!grounded(a) && !grounded(b)) return
  const fa = currentFrame(a)
  const fb = currentFrame(b)
  const pa = worldBox(fa.push, a.x, a.y, a.facing)
  const pb = worldBox(fb.push, b.x, b.y, b.facing)
  const overlap = Math.min(pa.x + pa.w, pb.x + pb.w) - Math.max(pa.x, pb.x)
  if (overlap <= 0) return
  const mid = (pa.x + pa.w / 2 + pb.x + pb.w / 2) / 2
  const aLeft = a.x <= b.x
  let push = overlap / 2 + 0.5
  const left = aLeft ? a : b
  const right = aLeft ? b : a
  const leftAtWall = left.x <= STAGE_PAD + 0.5
  const rightAtWall = right.x >= STAGE_W - STAGE_PAD - 0.5
  if (leftAtWall && !rightAtWall) {
    right.x += overlap + 0.5
  } else if (rightAtWall && !leftAtWall) {
    left.x -= overlap + 0.5
  } else {
    left.x -= push
    right.x += push
  }
  void mid
  clampStage(a)
  clampStage(b)
}
