import { CHARGE_FRAMES, MOTION_WINDOW } from '../config.ts'
import { faceRel } from '../fight/boxes.ts'
import type { Facing, InputBuffer } from '../fight/types.ts'
import type { MotionKind } from '../fight/types.ts'

export function createBuffer(): InputBuffer {
  return { events: [], lastDir: 5, chargeBack: 0, chargeGrace: 0 }
}

export function resetBuffer(buf: InputBuffer): void {
  buf.events.length = 0
  buf.lastDir = 5
  buf.chargeBack = 0
  buf.chargeGrace = 0
}

export function pushDir(buf: InputBuffer, worldDir: number, frame: number, facing: Facing): void {
  if (worldDir !== buf.lastDir) {
    buf.events.push({ dir: worldDir, frame })
    if (buf.events.length > 24) buf.events.shift()
    buf.lastDir = worldDir
  }
  const rel = faceRel(worldDir, facing)
  const holdingBack = rel === 4 || rel === 1 || rel === 7
  if (holdingBack) {
    buf.chargeBack += 1
    buf.chargeGrace = 14
  } else if (buf.chargeGrace > 0) {
    buf.chargeGrace -= 1
  } else {
    buf.chargeBack = 0
  }
}

const MOTIONS: Record<Exclude<MotionKind, 'charge'>, number[]> = {
  qcf: [2, 3, 6],
  qcb: [2, 1, 4],
  dp: [6, 2, 3],
}

function neighbors(dir: number): number[] {
  const n: Record<number, number[]> = {
    1: [1, 2, 4],
    2: [1, 2, 3],
    3: [2, 3, 6],
    4: [1, 4, 7],
    6: [3, 6, 9],
    7: [4, 7, 8],
    8: [7, 8, 9],
    9: [6, 8, 9],
    5: [5],
  }
  return n[dir] ?? [dir]
}

function matchSeq(
  buf: InputBuffer,
  seq: number[],
  now: number,
  facing: Facing,
  window: number,
): boolean {
  let eventIdx = buf.events.length - 1
  let latest = now
  for (let s = seq.length - 1; s >= 0; s--) {
    const target = seq[s]
    const want = neighbors(target)
    let found = false
    while (eventIdx >= 0) {
      const ev = buf.events[eventIdx]
      if (latest - ev.frame > window) return false
      const rel = faceRel(ev.dir, facing)
      if (want.includes(rel)) {
        found = true
        latest = ev.frame
        eventIdx -= 1
        break
      }
      eventIdx -= 1
    }
    if (!found) return false
  }
  return true
}

export function matchMotion(
  buf: InputBuffer,
  motion: MotionKind,
  now: number,
  facing: Facing,
): boolean {
  if (motion === 'charge') {
    return buf.chargeBack >= CHARGE_FRAMES && [6, 3, 9].includes(faceRel(buf.lastDir, facing))
  }
  return matchSeq(buf, MOTIONS[motion], now, facing, MOTION_WINDOW)
}

/** Test helper: feed a sequence of world dirs, one per frame. */
export function feedDirs(dirs: number[], facing: Facing = 1): InputBuffer {
  const buf = createBuffer()
  dirs.forEach((d, i) => pushDir(buf, d, i, facing))
  return buf
}
