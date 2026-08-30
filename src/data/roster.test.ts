import { describe, expect, it } from 'vitest'
import { CHAR_IDS } from '../config.ts'
import type { MotionKind } from '../fight/types.ts'
import { SPECIAL_LINES } from './moves.ts'
import { getChar, pickCpuOpponent } from './roster.ts'

const MOTION_TAG: Record<MotionKind, string> = {
  qcf: 'QCF',
  qcb: 'QCB',
  dp: 'DP',
  charge: 'CHARGE',
}

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

  it('lists bob bill drill on QCF+P and venom spur on QCF+K', () => {
    const bob = getChar('bob')
    expect(bob.specials.some((s) => s.motion === 'qcf' && s.button === 'p' && s.light === 'billDrillL')).toBe(true)
    expect(bob.specials.some((s) => s.motion === 'qcf' && s.button === 'k' && s.light === 'venomSpurL')).toBe(true)
    expect(bob.specials.some((s) => s.motion === 'dp')).toBe(false)
  })

  it('lists soldier with a pistol special', () => {
    expect(CHAR_IDS).toContain('soldier')
    const soldier = getChar('soldier')
    expect(soldier.specials.some((s) => s.light === 'pistolShotL')).toBe(true)
    expect(soldier.moves.standLP).toBeTruthy()
    expect(soldier.moves.standHK).toBeTruthy()
  })

  it('lists chainsaw with a chain hook and saw slash', () => {
    expect(CHAR_IDS).toContain('chainsaw')
    const saw = getChar('chainsaw')
    expect(saw.specials.some((s) => s.light === 'chainHookL')).toBe(true)
    expect(saw.specials.some((s) => s.light === 'sawSlashL')).toBe(true)
    expect(saw.moves.standLP).toBeTruthy()
    expect(saw.moves.standHK).toBeTruthy()
  })

  it('lists toxic with a gas bomb and meltdown', () => {
    expect(CHAR_IDS).toContain('toxic')
    const tox = getChar('toxic')
    expect(tox.specials.some((s) => s.light === 'gasBombL')).toBe(true)
    expect(tox.specials.some((s) => s.light === 'meltDownL')).toBe(true)
    expect(tox.moves.standLP).toBeTruthy()
    expect(tox.moves.standHK).toBeTruthy()
  })

  it('lists one special line per declared special', () => {
    for (const id of CHAR_IDS) {
      expect(SPECIAL_LINES[id], id).toHaveLength(getChar(id).specials.length)
    }
  })

  it('tags each special line with the authored motion', () => {
    for (const id of CHAR_IDS) {
      const def = getChar(id)
      for (const spec of def.specials) {
        const tag = MOTION_TAG[spec.motion]
        expect(
          SPECIAL_LINES[id].some((line) => line.includes(tag)),
          `${id} missing ${tag}`,
        ).toBe(true)
      }
    }
  })
})
