import type { CharId } from '../config.ts'
import { getChar } from '../data/roster.ts'

export const SPRITE_ORIGIN_X = 80
export const SPRITE_ORIGIN_Y = 156
export const SPRITE_SCALE = 0.7

export const POSES = [
  'idle',
  'walk',
  'crouch',
  'jump',
  'punch',
  'kick',
  'hurt',
  'win',
  'special1',
  'special2',
] as const

export type Pose = (typeof POSES)[number]

export function poseForAnim(anim: string, cell: number, charId?: CharId): Pose {
  if (anim === 'walk' || anim === 'walkBack') return cell % 2 === 0 ? 'walk' : 'idle'
  if (anim === 'idle' || anim === 'block') return 'idle'
  if (anim === 'crouch' || anim === 'crouchBlock' || anim === 'land' || anim === 'wakeup') return 'crouch'
  if (anim === 'jump') return 'jump'
  if (anim === 'win') return 'win'
  if (anim === 'hurt' || anim === 'thrown' || anim === 'knockdown' || anim === 'ko') return 'hurt'
  if (charId) {
    const def = getChar(charId)
    for (const spec of def.specials) {
      for (const moveId of [spec.light, spec.heavy]) {
        if (def.moves[moveId]?.anim === anim) return spec.pose
      }
    }
  }
  if (anim.includes('LK') || anim.includes('HK')) return 'kick'
  if (anim.includes('LP') || anim.includes('HP') || anim === 'throw') return 'punch'
  return 'idle'
}

export function spriteUrl(id: CharId, pose: Pose | 'portrait'): string {
  return `${import.meta.env.BASE_URL}sprites/${id}/${pose}.png`
}
