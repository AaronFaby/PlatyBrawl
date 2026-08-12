import { describe, expect, it } from 'vitest'
import { dirFromAxes, flipDir, overlaps, rect, worldBox } from './boxes.ts'

describe('AABB', () => {
  it('detects overlap', () => {
    expect(overlaps(rect(0, 0, 10, 10), rect(5, 5, 10, 10))).toBe(true)
    expect(overlaps(rect(0, 0, 10, 10), rect(11, 0, 10, 10))).toBe(false)
  })

  it('flips local boxes with facing', () => {
    const box = rect(8, -40, 20, 16)
    const r = worldBox(box, 100, 200, 1)
    const l = worldBox(box, 100, 200, -1)
    expect(r.x).toBe(108)
    expect(l.x).toBe(100 - 8 - 20)
    expect(r.y).toBe(l.y)
  })
})

describe('dirs', () => {
  it('maps axes to numpad', () => {
    expect(dirFromAxes(0, 0)).toBe(5)
    expect(dirFromAxes(1, 0)).toBe(6)
    expect(dirFromAxes(-1, 0)).toBe(4)
    expect(dirFromAxes(0, 1)).toBe(8)
    expect(dirFromAxes(0, -1)).toBe(2)
    expect(dirFromAxes(1, -1)).toBe(3)
  })

  it('flips facing dirs', () => {
    expect(flipDir(6)).toBe(4)
    expect(flipDir(4)).toBe(6)
    expect(flipDir(1)).toBe(3)
    expect(flipDir(5)).toBe(5)
  })
})
