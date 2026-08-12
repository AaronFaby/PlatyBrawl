import { airborne, grounded } from '../fight/fighter.ts'
import type { Fighter } from '../fight/types.ts'
import { emptyInput, type VirtualInput } from '../input/virtual.ts'

type Plan = { ticks: number; dir: number; lp?: boolean; hp?: boolean; lk?: boolean; hk?: boolean }

export type CpuBrain = {
  plan: Plan[]
  cool: number
  react: number
}

export function createCpu(): CpuBrain {
  return { plan: [], cool: 20, react: 0 }
}

export function resetCpu(cpu: CpuBrain): void {
  cpu.plan = []
  cpu.cool = 96
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
  const otherAtk = other.status === 'attack' || other.status === 'special'

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
    if (otherAtk && cpu.react >= 8) return holdGuard(me, other)
    if (otherAtk) cpu.react += 1
    else cpu.react = 0
    return stand()
  }

  const dist = Math.abs(other.x - me.x)
  const I = me.def.id
  cpu.cool = 16 + Math.floor(rand() * 22)

  if (airborne(other) && dist < 90 && I === 'bob' && grounded(me)) {
    pushMotion(cpu.plan, [6, 2, 3], rand() < 0.5 ? 'hp' : 'lp', me.facing)
    return stand()
  }

  if (otherAtk && dist < 110) {
    cpu.cool = 10
    return holdGuard(me, other)
  }

  if (dist > 160) {
    const r = rand()
    if (I === 'ninja' && r < 0.4) pushMotion(cpu.plan, [2, 3, 6], r < 0.15 ? 'hp' : 'lp', me.facing)
    else if (I === 'cyber' && me.buffer.chargeBack < 40 && r < 0.5) {
      cpu.plan.push({ ticks: 28, dir: away(me) })
    } else if (I === 'cyber' && me.buffer.chargeBack >= 40 && r < 0.55) {
      cpu.plan.push({ ticks: 3, dir: toward(me), hp: true })
    } else if (I === 'bob' && r < 0.2) {
      pushMotion(cpu.plan, [2, 3, 6], 'lp', me.facing)
    } else if (r < 0.75) {
      cpu.plan.push({ ticks: 14 + Math.floor(rand() * 12), dir: toward(me) })
    }
    return stand()
  }

  if (dist > 72) {
    const r = rand()
    if (r < 0.18 && I === 'ninja') pushMotion(cpu.plan, [2, 1, 4], rand() < 0.5 ? 'hk' : 'lk', me.facing)
    else if (r < 0.4) cpu.plan.push({ ticks: 2, dir: 5, lp: r < 0.28, lk: r >= 0.28 })
    else if (r < 0.5) {
      cpu.plan.push({ ticks: 12, dir: 8 })
      cpu.plan.push({ ticks: 6, dir: 5, hk: true })
    } else if (r < 0.72) cpu.plan.push({ ticks: 10, dir: toward(me) })
    return stand()
  }

  const r = rand()
  if (r < 0.1) cpu.plan.push({ ticks: 2, dir: 5, lp: true, lk: true })
  else if (r < 0.28) cpu.plan.push({ ticks: 8, dir: away(me) })
  else if (r < 0.4 && I === 'cyber') pushMotion(cpu.plan, [2, 3, 6], 'hk', me.facing)
  else if (r < 0.62) {
    cpu.plan.push({ ticks: 2, dir: 2, hk: r < 0.5, lp: r >= 0.5 })
  } else if (r < 0.85) {
    cpu.plan.push({ ticks: 2, dir: 5, hp: r > 0.75, lp: r <= 0.75 && r > 0.68, hk: r <= 0.68 })
  }
  return stand()
}


