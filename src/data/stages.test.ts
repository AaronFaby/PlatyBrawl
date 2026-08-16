import { describe, expect, it } from 'vitest'
import { CHAR_IDS } from '../config.ts'
import { CHAR_STAGE, STAGE_IDS, pickStage, stageForSession } from './stages.ts'

describe('pickStage', () => {
  it('returns a known stage', () => {
    expect(STAGE_IDS).toContain(pickStage())
  })

  it('can avoid repeating the last stage', () => {
    expect(pickStage('dojo', () => 0)).not.toBe('dojo')
    expect(pickStage('dojo', () => 0.99)).not.toBe('dojo')
  })

  it('lists a home stage for every fighter', () => {
    expect(STAGE_IDS).toEqual(['billabong', 'dojo', 'neonlab', 'armybase', 'toolshed'])
    for (const id of CHAR_IDS) {
      expect(STAGE_IDS).toContain(CHAR_STAGE[id])
    }
  })

  it('pins a chosen stage and randomizes only when asked', () => {
    expect(stageForSession('armybase')).toBe('armybase')
    expect(stageForSession('toolshed', 'toolshed')).toBe('toolshed')
    expect(stageForSession('random', 'dojo', () => 0)).not.toBe('dojo')
    expect(stageForSession(undefined, 'dojo', () => 0.99)).not.toBe('dojo')
  })
})
