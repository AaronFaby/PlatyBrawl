import type { CharId } from '../config.ts'
import type { CharDef } from '../fight/types.ts'
import { bob } from './characters/bob.ts'
import { cyber } from './characters/cyber.ts'
import { ninja } from './characters/ninja.ts'

const roster: Record<CharId, CharDef> = { bob, ninja, cyber }

export function getChar(id: CharId): CharDef {
  return roster[id]
}

export { bob, ninja, cyber }
