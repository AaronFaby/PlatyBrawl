import type { AnimFlags, AnimFrame, Box, MoveDef, MoveHeight } from '../fight/types.ts'
import { rect } from '../fight/boxes.ts'

export const standHurt: Box[] = [rect(-20, -68, 42, 68)]
export const standPush: Box = rect(-16, -58, 32, 58)
export const crouchHurt: Box[] = [rect(-22, -38, 46, 38)]
export const crouchPush: Box = rect(-18, -34, 36, 34)
export const airHurt: Box[] = [rect(-18, -66, 38, 52)]
export const airPush: Box = rect(-14, -56, 28, 46)

export function f(
  duration: number,
  opts: {
    cell?: number
    hurt?: Box[]
    hit?: Box[]
    push?: Box
    dvx?: number
    dvy?: number
    flags?: AnimFlags
  } = {},
): AnimFrame {
  return {
    cell: opts.cell ?? 0,
    duration,
    hurt: opts.hurt ?? standHurt,
    hit: opts.hit,
    push: opts.push ?? standPush,
    dvx: opts.dvx,
    dvy: opts.dvy,
    flags: opts.flags,
  }
}

export function loopIdle(frames = 8): AnimFrame[] {
  return [f(frames, { cell: 0 })]
}

export function loopWalk(): AnimFrame[] {
  return [f(6, { cell: 0 }), f(6, { cell: 1 }), f(6, { cell: 2 }), f(6, { cell: 3 })]
}

export function strike(opts: {
  id: string
  startup: number
  active: number
  recovery: number
  hit: Box
  damage: number
  hitstun: number
  blockstun: number
  hitstop: number
  height: MoveHeight
  knockdown?: boolean
  launch?: number
  dvx?: number
  dvy?: number
  hurt?: Box[]
  push?: Box
  cancelInto?: string[]
  pushHit?: number
  pushBlock?: number
  flags?: AnimFlags
  cellHit?: number
}): { anim: AnimFrame[]; move: MoveDef } {
  const hurt = opts.hurt ?? standHurt
  const push = opts.push ?? standPush
  const anim: AnimFrame[] = [
    f(opts.startup, { cell: 0, hurt, push }),
    f(opts.active, {
      cell: opts.cellHit ?? 1,
      hurt,
      push,
      hit: [opts.hit],
      dvx: opts.dvx,
      dvy: opts.dvy,
      flags: opts.flags,
    }),
    f(opts.recovery, { cell: 2, hurt, push }),
  ]
  const move: MoveDef = {
    id: opts.id,
    anim: opts.id,
    damage: opts.damage,
    onHitStun: opts.hitstun,
    onBlockStun: opts.blockstun,
    hitstop: opts.hitstop,
    knockdown: opts.knockdown,
    launch: opts.launch,
    height: opts.height,
    cancelInto: opts.cancelInto,
    pushHit: opts.pushHit,
    pushBlock: opts.pushBlock,
  }
  return { anim, move }
}
