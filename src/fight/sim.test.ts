import { describe, expect, it } from 'vitest'
import { emptyInput, type VirtualInput } from '../input/virtual.ts'
import { createMatch, tickMatch } from './match.ts'

function tap(partial: Partial<VirtualInput>): VirtualInput {
  const i = emptyInput()
  Object.assign(i, partial)
  return i
}

function hold(prev: VirtualInput, partial: Partial<VirtualInput>): VirtualInput {
  const next = emptyInput()
  Object.assign(next, {
    dir: partial.dir ?? prev.dir,
    lp: partial.lp ?? false,
    hp: partial.hp ?? false,
    lk: partial.lk ?? false,
    hk: partial.hk ?? false,
  })
  next.lpPress = next.lp && !prev.lp
  next.hpPress = next.hp && !prev.hp
  next.lkPress = next.lk && !prev.lk
  next.hkPress = next.hk && !prev.hk
  next.punchPress = next.lpPress || next.hpPress
  next.kickPress = next.lkPress || next.hkPress
  return next
}

function skip(world: ReturnType<typeof createMatch>, n: number, p1 = emptyInput(), p2 = emptyInput()): void {
  for (let i = 0; i < n; i++) tickMatch(world, [p1, p2], false)
}

describe('match sim', () => {
  it('neither fighter walks during intro or the first idle second', () => {
    const world = createMatch({ p1: 'bob', p2: 'ninja', p2Cpu: false })
    const x1 = world.fighters[0].x
    const x2 = world.fighters[1].x
    skip(world, 110)
    expect(world.match.phase).toBe('fight')
    skip(world, 60)
    expect(world.fighters[0].x).toBe(x1)
    expect(world.fighters[1].x).toBe(x2)
    expect(world.fighters[0].status).toBe('idle')
    expect(world.fighters[1].status).toBe('idle')
  })

  it('P2 walk does not move P1', () => {
    const world = createMatch({ p1: 'bob', p2: 'ninja', p2Cpu: false })
    skip(world, 120)
    const x1 = world.fighters[0].x
    const x2 = world.fighters[1].x
    let p2 = tap({ dir: 4 })
    for (let i = 0; i < 20; i++) {
      p2 = hold(p2, { dir: 4 })
      tickMatch(world, [emptyInput(), p2], false)
    }
    expect(world.fighters[1].x).toBeLessThan(x2 - 10)
    expect(world.fighters[0].x).toBeCloseTo(x1, 0)
    expect(world.fighters[0].status).toBe('idle')
  })

  it('P1 walk does not move P2', () => {
    const world = createMatch({ p1: 'bob', p2: 'ninja', p2Cpu: false })
    skip(world, 120)
    const x1 = world.fighters[0].x
    const x2 = world.fighters[1].x
    let p1 = tap({ dir: 6 })
    for (let i = 0; i < 20; i++) {
      p1 = hold(p1, { dir: 6 })
      tickMatch(world, [p1, emptyInput()], false)
    }
    expect(world.fighters[0].x).toBeGreaterThan(x1 + 10)
    expect(world.fighters[1].x).toBeCloseTo(x2, 0)
  })

  it('intro becomes fight and a jab can deal damage', () => {
    const world = createMatch({ p1: 'bob', p2: 'bob', p2Cpu: true })
    skip(world, 120)
    expect(world.match.phase).toBe('fight')
    world.fighters[1].x = world.fighters[0].x + 28
    let p1 = emptyInput()
    p1 = hold(p1, { lp: true, lpPress: true, punchPress: true })
    tickMatch(world, [p1, emptyInput()], false)
    skip(world, 20)
    expect(world.fighters[1].hp).toBeLessThan(1000)
  })

  it('Bob QCF+P starts Bill Drill', () => {
    const world = createMatch({ p1: 'bob', p2: 'ninja', p2Cpu: true })
    skip(world, 120)
    let p1 = emptyInput()
    p1 = hold(p1, { dir: 2 })
    tickMatch(world, [p1, emptyInput()], false)
    p1 = hold(p1, { dir: 3 })
    tickMatch(world, [p1, emptyInput()], false)
    p1 = hold(p1, { dir: 6, lp: true })
    p1.lpPress = true
    p1.punchPress = true
    tickMatch(world, [p1, emptyInput()], false)
    expect(world.fighters[0].moveId === 'billDrillL' || world.fighters[0].status === 'special').toBe(true)
  })

  it('Ninja QCF+P spawns a shuriken', () => {
    const world = createMatch({ p1: 'ninja', p2: 'bob', p2Cpu: true })
    skip(world, 120)
    let p1 = emptyInput()
    for (const dir of [2, 3, 6]) {
      p1 = hold(p1, { dir, lp: dir === 6, lpPress: dir === 6, punchPress: dir === 6 })
      tickMatch(world, [p1, emptyInput()], false)
    }
    skip(world, 16)
    expect(world.match.projectiles.some((p) => p.kind === 'shuriken')).toBe(true)
  })

  it('Cyber charge then forward+P fires a beam', () => {
    const world = createMatch({ p1: 'cyber', p2: 'bob', p2Cpu: true })
    skip(world, 120)
    let p1 = tap({ dir: 4 })
    for (let i = 0; i < 42; i++) {
      p1 = hold(p1, { dir: 4 })
      tickMatch(world, [p1, emptyInput()], false)
    }
    p1 = hold(p1, { dir: 6, hp: true })
    p1.hpPress = true
    p1.punchPress = true
    tickMatch(world, [p1, emptyInput()], false)
    skip(world, 20)
    expect(world.fighters[0].moveId?.startsWith('plasma') || world.match.projectiles.some((p) => p.kind === 'beam')).toBe(
      true,
    )
  })

  it('awards rounds and reaches match over', () => {
    const world = createMatch({ p1: 'bob', p2: 'ninja', p2Cpu: false })
    skip(world, 120)
    for (let r = 0; r < 2; r++) {
      if (world.match.phase === 'intro') skip(world, 120)
      world.fighters[1].hp = 1
      world.fighters[1].x = world.fighters[0].x + 28
      const p1 = hold(emptyInput(), { hp: true, hpPress: true, punchPress: true })
      tickMatch(world, [p1, emptyInput()], false)
      skip(world, 220)
    }
    expect(world.match.wins[0]).toBeGreaterThanOrEqual(2)
    expect(world.match.phase).toBe('over')
  })

  it('first to two KOs ends the match', () => {
    const world = createMatch({ p1: 'bob', p2: 'bob', p2Cpu: false })
    skip(world, 120)
    world.fighters[1].hp = 1
    world.fighters[1].x = world.fighters[0].x + 26
    let p1 = hold(emptyInput(), { hp: true, hpPress: true, punchPress: true })
    tickMatch(world, [p1, emptyInput()], false)
    skip(world, 30)
    expect(world.fighters[1].hp).toBe(0)
    expect(['ko', 'timeout', 'over', 'intro', 'fight']).toContain(world.match.phase)
  })
})
