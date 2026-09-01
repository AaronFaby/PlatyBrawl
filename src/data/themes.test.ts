import { describe, expect, it } from 'vitest'
import { CHAR_IDS } from '../config.ts'
import { trackReady } from '../audio/bgm.ts'
import { THEME_IDS, fightTrack, pickTheme, themeName } from './themes.ts'

describe('themes', () => {
  it('lists the title theme and one theme per fighter', () => {
    expect(THEME_IDS).toEqual(['title', ...CHAR_IDS])
    expect(themeName('title')).toBe('TITLE THEME')
    for (const id of CHAR_IDS) {
      expect(themeName(id).endsWith(' THEME')).toBe(true)
    }
  })

  it('defaults fight music to P1 unless the session picked a theme', () => {
    expect(fightTrack({ p1: 'bob' })).toBe('bob')
    expect(fightTrack({ p1: 'bob', bgmId: 'chainsaw' })).toBe('chainsaw')
    expect(fightTrack({ p1: 'bob', bgmId: 'title' })).toBe('title')
  })

  it('picks a real theme', () => {
    expect(THEME_IDS).toContain(pickTheme(() => 0))
    expect(THEME_IDS).toContain(pickTheme(() => 0.99))
  })

  it('can build every selectable theme', () => {
    for (const id of THEME_IDS) expect(trackReady(id)).toBe(true)
    expect(trackReady('win')).toBe(true)
  })
})
