import { describe, expect, it } from 'vitest'
import { createMatch, tickMatch } from '../fight/match.ts'
import { emptyInput } from '../input/virtual.ts'
import { createCpu, resetCpu, tickCpu } from './cpu.ts'

describe('cpu does not shuffle with the player', () => {
  it('stands still while cooling down if the opponent is not attacking', () => {
    const world = createMatch({ p1: 'bob', p2: 'ninja', p2Cpu: true })
    for (let i = 0; i < 120; i++) tickMatch(world, [emptyInput(), emptyInput()], false)
    const cpu = createCpu()
    cpu.cool = 20
    cpu.plan = []
    const input = tickCpu(cpu, world.fighters[1], world.fighters[0])
    expect(input.dir).toBe(5)
    expect(input.lp || input.hp || input.lk || input.hk).toBe(false)
  })

  it('does not walk just because P1 is walking', () => {
    const world = createMatch({ p1: 'bob', p2: 'ninja', p2Cpu: false })
    for (let i = 0; i < 120; i++) tickMatch(world, [emptyInput(), emptyInput()], false)
    const start = world.fighters[1].x
    const cpu = createCpu()
    cpu.cool = 40
    cpu.plan = []
    for (let i = 0; i < 30; i++) {
      const p1 = emptyInput()
      p1.dir = 6
      const p2 = tickCpu(cpu, world.fighters[1], world.fighters[0])
      tickMatch(world, [p1, p2], false)
    }
    expect(Math.abs(world.fighters[1].x - start)).toBeLessThan(4)
  })
})

describe('cpu difficulty', () => {
  it('hard blocks sooner than normal while cooling down', () => {
    const world = createMatch({ p1: 'bob', p2: 'ninja', p2Cpu: true })
    for (let i = 0; i < 120; i++) tickMatch(world, [emptyInput(), emptyInput()], false)
    world.fighters[0].status = 'attack'
    world.fighters[0].moveId = 'standLP'

    const normal = createCpu('normal')
    normal.cool = 20
    normal.react = 3
    const nIn = tickCpu(normal, world.fighters[1], world.fighters[0])
    expect(nIn.dir).toBe(5)

    const hard = createCpu('hard')
    hard.cool = 20
    hard.react = 3
    const hIn = tickCpu(hard, world.fighters[1], world.fighters[0])
    expect(hIn.dir).toBe(6)
  })

  it('hard starts a round with a shorter wait', () => {
    const normal = createCpu('normal')
    resetCpu(normal)
    const hard = createCpu('hard')
    resetCpu(hard)
    expect(hard.cool).toBeLessThan(normal.cool)
  })

  it('cyber can rocket knee at close range instead of only walking in', () => {
    const world = createMatch({ p1: 'bob', p2: 'cyber', p2Cpu: true })
    for (let i = 0; i < 120; i++) tickMatch(world, [emptyInput(), emptyInput()], false)
    world.fighters[1].x = world.fighters[0].x + 60
    let knees = 0
    for (let i = 0; i < 80; i++) {
      const cpu = createCpu('normal')
      cpu.cool = 0
      cpu.plan = []
      tickCpu(cpu, world.fighters[1], world.fighters[0])
      const dirs = cpu.plan.map((s) => s.dir)
      const kick = cpu.plan.some((s) => s.lk || s.hk)
      if (kick && dirs[0] === 2 && dirs.includes(1) && dirs.includes(4)) knees += 1
    }
    expect(knees).toBeGreaterThan(0)
  })

  it('hard ninja anti-airs with a ninja motion, not Bob DP', () => {
    const world = createMatch({ p1: 'bob', p2: 'ninja', p2Cpu: true })
    for (let i = 0; i < 120; i++) tickMatch(world, [emptyInput(), emptyInput()], false)
    world.fighters[0].status = 'jump'
    world.fighters[0].y = 180
    world.fighters[1].x = world.fighters[0].x + 50
    const cpu = createCpu('hard')
    cpu.cool = 0
    cpu.plan = []
    tickCpu(cpu, world.fighters[1], world.fighters[0])
    const dirs = cpu.plan.map((s) => s.dir)
    expect(dirs.slice(0, 3)).not.toEqual([4, 2, 1])
    expect(dirs[0]).toBe(2)
  })

  it('cyber approaches or uses a special instead of only retreating', () => {
    const world = createMatch({ p1: 'bob', p2: 'cyber', p2Cpu: true })
    for (let i = 0; i < 120; i++) tickMatch(world, [emptyInput(), emptyInput()], false)
    const cpu = createCpu('normal')
    cpu.cool = 0
    cpu.plan = []
    const start = world.fighters[1].x
    let usedSpecial = false
    for (let i = 0; i < 200; i++) {
      const p2 = tickCpu(cpu, world.fighters[1], world.fighters[0])
      tickMatch(world, [emptyInput(), p2], false)
      const move = world.fighters[1].moveId
      if (move?.startsWith('plasma') || move?.startsWith('rocket')) usedSpecial = true
    }
    const walkedIn = world.fighters[1].x < start - 6
    expect(usedSpecial || walkedIn).toBe(true)
  })
})
