import { CHAR_IDS, type CharId } from '../config.ts'
import type { CharDef } from '../fight/types.ts'
import { bob } from './characters/bob.ts'
import { cyber } from './characters/cyber.ts'
import { ninja } from './characters/ninja.ts'

const roster: Record<CharId, CharDef> = { bob, ninja, cyber }

export function getChar(id: CharId): CharDef {
  return roster[id]
}

/** CPU never mirrors: pick one of the two characters P1 did not lock. */
export function pickCpuOpponent(p1: CharId, rng: () => number = Math.random): CharId {
  const others = CHAR_IDS.filter((id) => id !== p1)
  return others[Math.floor(rng() * others.length)] ?? others[0]
}

export { bob, ninja, cyber }
