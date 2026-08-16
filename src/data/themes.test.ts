import { describe, expect, it } from 'vitest'
import { CHAR_IDS } from '../config.ts'
import { trackReady } from '../audio/bgm.ts'
import { THEME_IDS, fightTrack, pickTheme, themeName } from './themes.ts'

describe('themes', () => {
  it('has one theme per fighter', () => {
    expect(THEME_IDS).toEqual(CHAR_IDS)
    for (const id of CHAR_IDS) {
      expect(themeName(id).endsWith(' THEME')).toBe(true)
    }
  })

  it('defaults fight music to P1 unless the session picked a theme', () => {
    expect(fightTrack({ p1: 'bob' })).toBe('bob')
    expect(fightTrack({ p1: 'bob', bgmId: 'chainsaw' })).toBe('chainsaw')
  })

  it('picks a real theme', () => {
    expect(CHAR_IDS).toContain(pickTheme(() => 0))
    expect(CHAR_IDS).toContain(pickTheme(() => 0.99))
  })

  it('can build every fighter theme', () => {
    for (const id of CHAR_IDS) expect(trackReady(id)).toBe(true)
    expect(trackReady('title')).toBe(true)
    expect(trackReady('win')).toBe(true)
  })
})
