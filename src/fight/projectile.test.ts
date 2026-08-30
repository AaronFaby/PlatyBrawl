import { describe, expect, it } from 'vitest'
import { createFighter } from './fighter.ts'
import { spawnFrom } from './projectile.ts'

describe('spawnFrom', () => {
  it('puts a soldier bullet at the pistol muzzle, not over the helmet', () => {
    const f = createFighter(0, 'soldier', 220, 1)
    const p = spawnFrom(f, 'bullet', false)
    expect(p.x).toBeCloseTo(220 + 40.3, 1)
    expect(p.y).toBeCloseTo(f.y - 51.6, 1)
    expect(p.y).toBeGreaterThan(f.y - 62)
    const left = createFighter(0, 'soldier', 400, -1)
    const q = spawnFrom(left, 'bullet', true)
    expect(q.x).toBeCloseTo(400 - 40.3, 1)
    expect(q.y).toBeCloseTo(left.y - 51.6, 1)
  })

  it('puts a toxic gas bomb at the throwing hand, not the torso', () => {
    const f = createFighter(0, 'toxic', 220, 1)
    const p = spawnFrom(f, 'gas', false)
    expect(p.x).toBeCloseTo(220 + 43.8, 1)
    expect(p.y).toBeCloseTo(f.y - 43.8, 1)
    expect(p.poison).toBeTruthy()
    const left = createFighter(0, 'toxic', 400, -1)
    const q = spawnFrom(left, 'gas', true)
    expect(q.x).toBeCloseTo(400 - 43.8, 1)
    expect(q.y).toBeCloseTo(left.y - 43.8, 1)
    expect(q.poison?.duration).toBeGreaterThan(p.poison!.duration)
  })

  it('puts a ninja shuriken at the thrown star, not the torso', () => {
    const f = createFighter(0, 'ninja', 220, 1)
    const p = spawnFrom(f, 'shuriken', false)
    expect(p.x).toBeCloseTo(220 + 47.5, 1)
    expect(p.y).toBeCloseTo(f.y - 38.0, 1)
  })

  it('puts a cyber beam at the hands', () => {
    const f = createFighter(0, 'cyber', 220, 1)
    const p = spawnFrom(f, 'beam', false)
    expect(p.x).toBeCloseTo(220 + 16.4, 1)
    expect(p.y).toBeCloseTo(f.y - 37.9, 1)
  })

  it('stamps the owner reversal flag at spawn', () => {
    const idle = createFighter(0, 'ninja', 220, 1)
    expect(spawnFrom(idle, 'shuriken', false).reversal).toBe(false)
    idle.reversal = true
    const star = spawnFrom(idle, 'shuriken', false)
    expect(star.reversal).toBe(true)
    idle.reversal = false
    expect(star.reversal).toBe(true)
    expect(spawnFrom(idle, 'shuriken', false).reversal).toBe(false)
  })

  it('puts a chainsaw hook at the saw bill, not the torso', () => {
    const f = createFighter(0, 'chainsaw', 220, 1)
    const p = spawnFrom(f, 'chain', false)
    expect(p.x).toBeCloseTo(220 + 51.0, 1)
    expect(p.y).toBeCloseTo(f.y - 49.6, 1)
    expect(p.pull).toBeTruthy()
    const left = createFighter(0, 'chainsaw', 400, -1)
    const q = spawnFrom(left, 'chain', true)
    expect(q.x).toBeCloseTo(400 - 51.0, 1)
    expect(q.y).toBeCloseTo(left.y - 49.6, 1)
    expect(q.pull).toBeTruthy()
  })
})
