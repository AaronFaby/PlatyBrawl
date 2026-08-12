import { describe, expect, it } from 'vitest'
import { feedDirs, matchMotion, createBuffer, pushDir } from './buffer.ts'
import { CHARGE_FRAMES } from '../config.ts'

describe('motion matcher', () => {
  it('matches QCF facing right', () => {
    const buf = feedDirs([5, 2, 3, 6], 1)
    expect(matchMotion(buf, 'qcf', 4, 1)).toBe(true)
  })

  it('matches QCF facing left (world 2,1,4)', () => {
    const buf = feedDirs([5, 2, 1, 4], -1)
    expect(matchMotion(buf, 'qcf', 4, -1)).toBe(true)
  })

  it('matches DP facing right', () => {
    const buf = feedDirs([5, 6, 2, 3], 1)
    expect(matchMotion(buf, 'dp', 4, 1)).toBe(true)
  })

  it('does not match QCF as DP', () => {
    const buf = feedDirs([5, 2, 3, 6], 1)
    expect(matchMotion(buf, 'dp', 4, 1)).toBe(false)
  })

  it('matches QCB', () => {
    const buf = feedDirs([5, 2, 1, 4], 1)
    expect(matchMotion(buf, 'qcb', 4, 1)).toBe(true)
  })

  it('charge succeeds at 40 back then forward', () => {
    const buf = createBuffer()
    let f = 0
    for (let i = 0; i < CHARGE_FRAMES; i++) pushDir(buf, 4, f++, 1)
    pushDir(buf, 6, f, 1)
    expect(matchMotion(buf, 'charge', f, 1)).toBe(true)
  })

  it('charge fails at 39 back', () => {
    const buf = createBuffer()
    let f = 0
    for (let i = 0; i < CHARGE_FRAMES - 1; i++) pushDir(buf, 4, f++, 1)
    pushDir(buf, 6, f, 1)
    expect(matchMotion(buf, 'charge', f, 1)).toBe(false)
  })
})
