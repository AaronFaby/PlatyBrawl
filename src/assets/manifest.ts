import type { CharId } from '../config.ts'

export const SPRITE_CELL = 160
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

export function poseForAnim(anim: string, cell: number): Pose {
  if (anim === 'walk' || anim === 'walkBack') return cell % 2 === 0 ? 'walk' : 'idle'
  if (anim === 'idle' || anim === 'block') return 'idle'
  if (anim === 'crouch' || anim === 'crouchBlock' || anim === 'land' || anim === 'wakeup') return 'crouch'
  if (anim === 'jump') return 'jump'
  if (anim === 'win') return 'win'
  if (anim === 'hurt' || anim === 'thrown' || anim === 'knockdown' || anim === 'ko') return 'hurt'
  if (anim.startsWith('billDrill') || anim.startsWith('shuriken') || anim.startsWith('plasma')) return 'special1'
  if (anim.startsWith('venom') || anim.startsWith('shadow') || anim.startsWith('rocket')) return 'special2'
  if (anim.includes('LK') || anim.includes('HK') || anim === 'standLK' || anim === 'standHK') return 'kick'
  if (anim.includes('LP') || anim.includes('HP') || anim === 'throw') return 'punch'
  return 'idle'
}

export function spriteUrl(id: CharId, pose: Pose | 'portrait'): string {
  return `${import.meta.env.BASE_URL}sprites/${id}/${pose}.png`
}

export { STAGE_IDS, stageUrl, type StageId } from '../data/stages.ts'
