import { describe, expect, it } from 'vitest'
import { createMatch, tickMatch } from '../fight/match.ts'
import { emptyInput } from '../input/virtual.ts'
import { createCpu, tickCpu } from './cpu.ts'

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
