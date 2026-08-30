import { describe, expect, it } from 'vitest'
import { spriteDrawScale } from './sprite.ts'

describe('spriteDrawScale', () => {
  it('draws every idle at the same world height', () => {
    const bob = spriteDrawScale(102, 102, false)
    const cyber = spriteDrawScale(137, 137, false)
    const soldier = spriteDrawScale(150, 150, false)
    const toxic = spriteDrawScale(148, 148, false)
    expect(bob * 102).toBeCloseTo(cyber * 137, 5)
    expect(bob * 102).toBeCloseTo(soldier * 150, 5)
    expect(bob * 102).toBeCloseTo(toxic * 148, 5)
  })

  it('upsizes a packed punch so it matches idle height', () => {
    const idle = spriteDrawScale(137, 137, false)
    const punch = spriteDrawScale(137, 103, false)
    expect(punch * 103).toBeCloseTo(idle * 137, 5)
  })

  it('does not stretch crouch up to idle height', () => {
    const idle = spriteDrawScale(137, 137, false)
    const crouch = spriteDrawScale(137, 118, true)
    expect(crouch).toBe(idle)
    expect(crouch * 118).toBeLessThan(idle * 137)
  })

  it('shrinks a packed-tall crouch so it is not taller than idle', () => {
    const idle = spriteDrawScale(108, 108, false)
    const crouch = spriteDrawScale(108, 137, true)
    expect(crouch * 137).toBeLessThanOrEqual(idle * 108)
  })
})
