import { describe, expect, it } from 'vitest'
import { CHAR_IDS } from '../config.ts'
import { pickCpuOpponent } from './roster.ts'

describe('pickCpuOpponent', () => {
  it('never mirrors the player', () => {
    for (const p1 of CHAR_IDS) {
      const a = pickCpuOpponent(p1, () => 0)
      const b = pickCpuOpponent(p1, () => 0.99)
      expect(a).not.toBe(p1)
      expect(b).not.toBe(p1)
      expect(new Set([a, b]).size).toBe(2)
    }
  })
})
