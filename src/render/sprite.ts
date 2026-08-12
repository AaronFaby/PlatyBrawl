import type { CharId } from '../config.ts'
import { CHAR_IDS } from '../config.ts'
import { STAGE_IDS, stageUrl, type StageId } from '../data/stages.ts'
import { currentFrame } from '../fight/fighter.ts'
import type { Fighter } from '../fight/types.ts'
import {
  POSES,
  poseForAnim,
  SPRITE_ORIGIN_X,
  SPRITE_ORIGIN_Y,
  SPRITE_SCALE,
  spriteUrl,
  type Pose,
} from '../assets/manifest.ts'
import type { Cam } from './camera.ts'

export type SpriteBank = {
  chars: Record<CharId, Partial<Record<Pose | 'portrait', HTMLImageElement>>>
  stages: Partial<Record<StageId, HTMLImageElement>>
  ready: boolean
}

export const bank: SpriteBank = {
  chars: { bob: {}, ninja: {}, cyber: {} },
  stages: {},
  ready: false,
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

export async function loadSprites(): Promise<void> {
  const jobs: Promise<void>[] = []
  for (const id of CHAR_IDS) {
    for (const pose of [...POSES, 'portrait'] as const) {
      jobs.push(
        loadImage(spriteUrl(id, pose)).then((img) => {
          if (img) bank.chars[id][pose] = img
        }),
      )
    }
  }
  for (const id of STAGE_IDS) {
    jobs.push(
      loadImage(stageUrl(id)).then((img) => {
        if (img) bank.stages[id] = img
      }),
    )
  }
  await Promise.all(jobs)
  bank.ready = true
}

export function drawSpriteFighter(ctx: CanvasRenderingContext2D, f: Fighter, cam: Cam): boolean {
  const pose = poseForAnim(f.anim, currentFrame(f).cell)
  const img = bank.chars[f.charId][pose] ?? bank.chars[f.charId].idle
  if (!img) return false
  const x = f.x - cam.x
  const y = f.y - cam.y
  ctx.save()
  ctx.translate(Math.round(x), Math.round(y))
  ctx.scale(f.facing * SPRITE_SCALE, SPRITE_SCALE)
  if (f.status === 'knockdown' || (f.status === 'ko' && f.y >= 229)) ctx.rotate(-1.2)
  if (f.flash > 0 && f.flash % 2 === 0) ctx.globalAlpha = 0.4
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(img, -SPRITE_ORIGIN_X, -SPRITE_ORIGIN_Y)
  ctx.restore()
  return true
}

export function getPortrait(id: CharId): HTMLImageElement | undefined {
  return bank.chars[id].portrait
}
