import { describe, expect, it } from 'vitest'
import { STAGE_IDS, pickStage } from './stages.ts'

describe('pickStage', () => {
  it('returns a known stage', () => {
    expect(STAGE_IDS).toContain(pickStage())
  })

  it('can avoid repeating the last stage', () => {
    expect(pickStage('dojo', () => 0)).not.toBe('dojo')
    expect(pickStage('dojo', () => 0.99)).not.toBe('dojo')
  })

  it('covers the ninja and cyborg arenas', () => {
    expect(STAGE_IDS).toEqual(['billabong', 'dojo', 'neonlab'])
  })
})
