import { describe, expect, it } from 'vitest'
import { createFighter } from './fighter.ts'
import { spawnFrom } from './projectile.ts'

describe('spawnFrom', () => {
  it('puts a soldier bullet at the pistol muzzle, not the torso', () => {
    const f = createFighter(0, 'soldier', 220, 1)
    const p = spawnFrom(f, 'bullet', false)
    expect(p.x).toBe(220 + 58)
    expect(p.y).toBe(f.y - 67)
    const left = createFighter(0, 'soldier', 400, -1)
    const q = spawnFrom(left, 'bullet', true)
    expect(q.x).toBe(400 - 58)
    expect(q.y).toBe(left.y - 67)
  })

  it('puts a chainsaw hook at the saw bill, not the torso', () => {
    const f = createFighter(0, 'chainsaw', 220, 1)
    const p = spawnFrom(f, 'chain', false)
    expect(p.x).toBe(220 + 30)
    expect(p.y).toBe(f.y - 46)
    expect(p.pull).toBeTruthy()
    const left = createFighter(0, 'chainsaw', 400, -1)
    const q = spawnFrom(left, 'chain', true)
    expect(q.x).toBe(400 - 30)
    expect(q.y).toBe(left.y - 46)
    expect(q.pull).toBeTruthy()
  })
})
