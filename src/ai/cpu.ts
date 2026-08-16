import { CHARGE_FRAMES, STAGE_W } from '../config.ts'
import { airborne, grounded } from '../fight/fighter.ts'
import type { CpuDifficulty, Fighter } from '../fight/types.ts'
import { emptyInput, type VirtualInput } from '../input/virtual.ts'

export type { CpuDifficulty }

type Plan = { ticks: number; dir: number; lp?: boolean; hp?: boolean; lk?: boolean; hk?: boolean }

type Tune = {
  reactFrames: number
  coolMin: number
  coolRange: number
  startCool: number
  blockRange: number
  special: number
}

const TUNE: Record<CpuDifficulty, Tune> = {
  normal: { reactFrames: 8, coolMin: 16, coolRange: 22, startCool: 96, blockRange: 110, special: 1 },
  hard: { reactFrames: 3, coolMin: 8, coolRange: 10, startCool: 36, blockRange: 150, special: 1.7 },
}

export type CpuBrain = {
  plan: Plan[]
  cool: number
  react: number
  difficulty: CpuDifficulty
}

export function createCpu(difficulty: CpuDifficulty = 'normal'): CpuBrain {
  return { plan: [], cool: 20, react: 0, difficulty }
}

export function resetCpu(cpu: CpuBrain): void {
  cpu.plan = []
  cpu.cool = TUNE[cpu.difficulty].startCool
  cpu.react = 0
}

function rand(): number {
  return Math.random()
}

function toward(me: Fighter): number {
  return me.facing === 1 ? 6 : 4
}

function away(me: Fighter): number {
  return me.facing === 1 ? 4 : 6
}

function flipWorld(d: number, facing: 1 | -1): number {
  if (facing === 1) return d
  const t: Record<number, number> = { 1: 3, 3: 1, 4: 6, 6: 4, 7: 9, 9: 7 }
  return t[d] ?? d
}

function pushMotion(plan: Plan[], motion: number[], button: 'lp' | 'hp' | 'lk' | 'hk', facing: 1 | -1): void {
  for (const d of motion) plan.push({ ticks: 2, dir: flipWorld(d, facing) })
  plan.push({ ticks: 2, dir: flipWorld(motion[motion.length - 1], facing), [button]: true })
}

function stand(): VirtualInput {
  return emptyInput()
}

function holdGuard(me: Fighter, other: Fighter): VirtualInput {
  const out = emptyInput()
  const worldBack = me.x < other.x ? 4 : 6
  const low = other.moveId?.startsWith('crouch')
  out.dir = low ? (worldBack === 4 ? 1 : 3) : worldBack
  return out
}

function cornered(me: Fighter): boolean {
  return me.x < 80 || me.x > STAGE_W - 80
}

/** Charge Plasma as one plan so cooldown cannot dump the charge, then rush with Rocket Knee. */
function planCyber(cpu: CpuBrain, me: Fighter, dist: number, hard: boolean): boolean {
  const charged = me.buffer.chargeBack >= CHARGE_FRAMES
  const r = rand()

  if (charged && dist > 64) {
    cpu.plan.push({ ticks: 3, dir: toward(me), hp: true })
    return true
  }

  if (dist > 70 && dist < 210 && r < (hard ? 0.52 : 0.4)) {
    pushMotion(cpu.plan, [2, 3, 6], rand() < 0.5 ? 'hk' : 'lk', me.facing)
    return true
  }

  if (dist > 140 && !cornered(me) && r < (hard ? 0.36 : 0.3)) {
    cpu.plan.push({ ticks: CHARGE_FRAMES + 4, dir: away(me) })
    cpu.plan.push({ ticks: 3, dir: toward(me), hp: true })
    return true
  }

  if (dist <= 72 && r < 0.4) {
    pushMotion(cpu.plan, [2, 3, 6], rand() < 0.45 ? 'hk' : 'lk', me.facing)
    return true
  }

  if (dist > 48 && r < 0.84) {
    cpu.plan.push({ ticks: 12 + Math.floor(rand() * 12), dir: toward(me) })
    return true
  }

  return false
}

function edgesFromHeld(held: VirtualInput): VirtualInput {
  held.lpPress = held.lp
  held.hpPress = held.hp
  held.lkPress = held.lk
  held.hkPress = held.hk
  held.punchPress = held.lp || held.hp
  held.kickPress = held.lk || held.hk
  return held
}

export function tickCpu(cpu: CpuBrain, me: Fighter, other: Fighter): VirtualInput {
  const tune = TUNE[cpu.difficulty]
  const otherAtk = other.status === 'attack' || other.status === 'special'
  const hard = cpu.difficulty === 'hard'
  const sp = tune.special

  if (cpu.plan.length > 0) {
    const step = cpu.plan[0]
    const out = emptyInput()
    out.dir = step.dir
    out.lp = !!step.lp
    out.hp = !!step.hp
    out.lk = !!step.lk
    out.hk = !!step.hk
    step.ticks -= 1
    if (step.ticks <= 0) cpu.plan.shift()
    return edgesFromHeld(out)
  }

  if (cpu.cool > 0) {
    cpu.cool -= 1
    if (otherAtk && cpu.react >= tune.reactFrames) return holdGuard(me, other)
    if (otherAtk) cpu.react += 1
    else cpu.react = 0
    return stand()
  }

  const dist = Math.abs(other.x - me.x)
  const I = me.def.id
  cpu.cool = tune.coolMin + Math.floor(rand() * tune.coolRange)

  if (airborne(other) && dist < 90 && grounded(me)) {
    if (I === 'cyber') {
      pushMotion(cpu.plan, [2, 3, 6], rand() < 0.5 ? 'hk' : 'lk', me.facing)
      return stand()
    }
    if (I === 'bob') {
      pushMotion(cpu.plan, [6, 2, 3], rand() < 0.5 ? 'hp' : 'lp', me.facing)
      return stand()
    }
    if (hard) {
      if (I === 'ninja' || I === 'soldier' || I === 'chainsaw') {
        pushMotion(cpu.plan, [2, 3, 6], rand() < 0.5 ? 'hp' : 'lp', me.facing)
      } else {
        cpu.plan.push({ ticks: 10, dir: 8 })
        cpu.plan.push({ ticks: 6, dir: 5, hk: true })
      }
      return stand()
    }
  }

  if (otherAtk && dist < tune.blockRange) {
    cpu.cool = tune.reactFrames + 2
    return holdGuard(me, other)
  }

  if (I === 'cyber' && planCyber(cpu, me, dist, hard)) return stand()

  if (dist > 160) {
    const r = rand()
    if (I === 'ninja' && r < 0.4 * sp) pushMotion(cpu.plan, [2, 3, 6], r < 0.15 * sp ? 'hp' : 'lp', me.facing)
    else if (I === 'soldier' && r < 0.45 * sp) pushMotion(cpu.plan, [2, 3, 6], r < 0.18 * sp ? 'hp' : 'lp', me.facing)
    else if (I === 'chainsaw' && r < 0.42 * sp) pushMotion(cpu.plan, [2, 3, 6], r < 0.16 * sp ? 'hp' : 'lp', me.facing)
    else if (I === 'bob' && r < 0.2 * sp) {
      pushMotion(cpu.plan, [2, 3, 6], 'lp', me.facing)
    } else if (r < (hard ? 0.9 : 0.75)) {
      cpu.plan.push({ ticks: 14 + Math.floor(rand() * 12), dir: toward(me) })
    }
    return stand()
  }

  if (dist > 72) {
    const r = rand()
    if (r < 0.18 * sp && I === 'ninja') pushMotion(cpu.plan, [2, 1, 4], rand() < 0.5 ? 'hk' : 'lk', me.facing)
    else if (r < (hard ? 0.32 : 0.4)) cpu.plan.push({ ticks: 2, dir: 5, lp: r < 0.28, lk: r >= 0.28 })
    else if (r < (hard ? 0.48 : 0.5)) {
      cpu.plan.push({ ticks: 12, dir: 8 })
      cpu.plan.push({ ticks: 6, dir: 5, hk: true })
    } else if (r < (hard ? 0.88 : 0.72)) cpu.plan.push({ ticks: 10, dir: toward(me) })
    return stand()
  }

  const r = rand()
  if (r < (hard ? 0.18 : 0.1)) cpu.plan.push({ ticks: 2, dir: 5, lp: true, lk: true })
  else if (r < (hard ? 0.24 : 0.28) && I !== 'cyber') cpu.plan.push({ ticks: 8, dir: away(me) })
  else if (r < 0.4 * sp && (I === 'cyber' || I === 'soldier' || I === 'chainsaw')) pushMotion(cpu.plan, [2, 3, 6], 'hk', me.facing)
  else if (r < (hard ? 0.72 : 0.62)) {
    cpu.plan.push({ ticks: 2, dir: 2, hk: r < 0.5, lp: r >= 0.5 })
  } else if (r < 0.85) {
    cpu.plan.push({ ticks: 2, dir: 5, hp: r > 0.75, lp: r <= 0.75 && r > 0.68, hk: r <= 0.68 })
  }
  return stand()
}


