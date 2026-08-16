import { CHAR_IDS, CHAR_META, type CharId } from '../config.ts'

export const THEME_IDS = CHAR_IDS

export function themeName(id: CharId): string {
  return `${CHAR_META[id].short} THEME`
}

export function pickTheme(rng: () => number = Math.random): CharId {
  return THEME_IDS[Math.floor(rng() * THEME_IDS.length)] ?? THEME_IDS[0]
}

export function fightTrack(session: { p1: CharId; bgmId?: CharId }): CharId {
  return session.bgmId ?? session.p1
}
