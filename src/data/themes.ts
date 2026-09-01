import { CHAR_IDS, CHAR_META, type CharId } from '../config.ts'

export type ThemeId = CharId | 'title'

export const THEME_IDS: readonly ThemeId[] = ['title', ...CHAR_IDS]

export function themeName(id: ThemeId): string {
  if (id === 'title') return 'TITLE THEME'
  return `${CHAR_META[id].short} THEME`
}

export function pickTheme(rng: () => number = Math.random): ThemeId {
  return THEME_IDS[Math.floor(rng() * THEME_IDS.length)] ?? THEME_IDS[0]
}

export function fightTrack(session: { p1: CharId; bgmId?: ThemeId }): ThemeId {
  return session.bgmId ?? session.p1
}
