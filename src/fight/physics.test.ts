import { describe, expect, it } from 'vitest'
import { GROUND_Y } from '../config.ts'
import { emptyInput } from '../input/virtual.ts'
import { createMatch, tickMatch } from './match.ts'
import { resolvePush } from './physics.ts'

function skip(world: ReturnType<typeof createMatch>, n: number): void {
  for (let i = 0; i < n; i++) tickMatch(world, [emptyInput(), emptyInput()], false)
}

describe('resolvePush', () => {
  it('separates two overlapping grounded fighters', () => {
    const world = createMatch({ p1: 'bob', p2: 'ninja', p2Cpu: false })
    skip(world, 120)
    world.fighters[0].x = 300
    world.fighters[1].x = 308
    const left = world.fighters[0].x
    const right = world.fighters[1].x
    resolvePush(world.fighters[0], world.fighters[1])
    expect(world.fighters[1].x - world.fighters[0].x).toBeGreaterThan(right - left)
  })

  it('does not shove a grounded fighter with a jumping one', () => {
    const world = createMatch({ p1: 'bob', p2: 'ninja', p2Cpu: false })
    skip(world, 120)
    world.fighters[0].x = 300
    world.fighters[1].x = 308
    world.fighters[0].y = GROUND_Y - 40
    world.fighters[0].vy = -2
    const groundedX = world.fighters[1].x
    const airX = world.fighters[0].x
    resolvePush(world.fighters[0], world.fighters[1])
    expect(world.fighters[1].x).toBe(groundedX)
    expect(world.fighters[0].x).toBe(airX)
  })
})
