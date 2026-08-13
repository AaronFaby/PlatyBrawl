export const LOGICAL_W = 480
export const LOGICAL_H = 270
export const DT = 1 / 60
export const MAX_FRAME_TIME = 0.25
export const GROUND_Y = 230
export const STAGE_W = 720
export const STAGE_PAD = 36
export const MAX_HP = 1000
export const ROUND_SECONDS = 99
export const WINS_NEEDED = 2
export const JUMP_V = -6.15
export const GRAVITY = 0.28
export const THROW_RANGE = 34
export const THROW_DAMAGE = 140
export const WAKEUP_INVULN = 6
export const LAND_RECOVERY = 4
export const CHARGE_FRAMES = 40
export const MOTION_WINDOW = 12
export const FONT = '"Press Start 2P", monospace'
export const VERSION = '0.1.0'

export const CHAR_IDS = ['bob', 'ninja', 'cyber'] as const
export type CharId = (typeof CHAR_IDS)[number]

export const CHAR_META: Record<
  CharId,
  { name: string; short: string; subtitle: string; color: string }
> = {
  bob: {
    name: 'BOB THE PLATY',
    short: 'BOB',
    subtitle: 'ALL-ROUNDER',
    color: '#f0d8a8',
  },
  ninja: {
    name: 'NINJA PLATY',
    short: 'NINJA',
    subtitle: 'RUSHDOWN',
    color: '#6b3a1f',
  },
  cyber: {
    name: 'CYBERPLATY',
    short: 'CYBER',
    subtitle: 'ZONER',
    color: '#5ad6e8',
  },
}
