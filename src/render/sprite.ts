import type { CharId } from '../config.ts'
import { CHAR_IDS } from '../config.ts'
import { STAGE_IDS, stageUrl, type StageId } from '../data/stages.ts'
import { currentFrame, grounded } from '../fight/fighter.ts'
import type { Fighter } from '../fight/types.ts'
import {
  IDLE_DRAW_H,
  POSES,
  poseForAnim,
  SPRITE_ORIGIN_X,
  SPRITE_ORIGIN_Y,
  spriteDrawScale,
  spriteUrl,
  type Pose,
} from '../assets/manifest.ts'
import type { Cam } from './camera.ts'

export { IDLE_DRAW_H, spriteDrawScale }

export type SrcRect = { x: number; y: number; w: number; h: number }

const opaqueCache = new WeakMap<HTMLImageElement, SrcRect>()

export function opaqueRect(img: HTMLImageElement): SrcRect {
  const hit = opaqueCache.get(img)
  if (hit) return hit
  const w = img.naturalWidth || img.width
  const h = img.naturalHeight || img.height
  const fallback = { x: 0, y: 0, w, h }
  let rect = fallback
  try {
    const scratch = document.createElement('canvas')
    scratch.width = w
    scratch.height = h
    const g = scratch.getContext('2d', { willReadFrequently: true })
    if (g) {
      g.drawImage(img, 0, 0)
      const pix = g.getImageData(0, 0, w, h).data
      let x0 = w
      let y0 = h
      let x1 = 0
      let y1 = 0
      for (let y = 0; y < h; y++) {
        const row = y * w * 4
        for (let x = 0; x < w; x++) {
          if (pix[row + x * 4 + 3] < 12) continue
          if (x < x0) x0 = x
          if (y < y0) y0 = y
          if (x > x1) x1 = x
          if (y > y1) y1 = y
        }
      }
      if (x1 >= x0) rect = { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 }
    }
  } catch {
    rect = fallback
  }
  opaqueCache.set(img, rect)
  return rect
}

export type SpriteBank = {
  chars: Record<CharId, Partial<Record<Pose | 'portrait', HTMLImageElement>>>
  stages: Partial<Record<StageId, HTMLImageElement>>
  ready: boolean
}

export const bank: SpriteBank = {
  chars: Object.fromEntries(CHAR_IDS.map((id) => [id, {}])) as SpriteBank['chars'],
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

async function loadCharSprites(): Promise<void> {
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
  await Promise.all(jobs)
}

export function loadStage(id: StageId): Promise<void> {
  if (bank.stages[id]) return Promise.resolve()
  return loadImage(stageUrl(id)).then((img) => {
    if (img) bank.stages[id] = img
  })
}

export function loadAllStages(): Promise<void> {
  return Promise.all(STAGE_IDS.map((id) => loadStage(id))).then(() => undefined)
}

export async function loadSprites(): Promise<void> {
  const stages = loadAllStages()
  await loadCharSprites()
  bank.ready = true
  void stages
}

export function drawSpriteFighter(ctx: CanvasRenderingContext2D, f: Fighter, cam: Cam): boolean {
  const pose = poseForAnim(f.anim, currentFrame(f).cell, f.charId)
  const img = bank.chars[f.charId][pose] ?? bank.chars[f.charId].idle
  if (!img) return false
  const idleImg = bank.chars[f.charId].idle ?? img
  const scale = spriteDrawScale(opaqueRect(idleImg).h, opaqueRect(img).h, pose === 'crouch')
  const x = f.x - cam.x
  const y = f.y - cam.y
  ctx.save()
  ctx.translate(Math.round(x), Math.round(y))
  ctx.scale(f.facing * scale, scale)
  if (f.status === 'knockdown' || (f.status === 'ko' && grounded(f))) ctx.rotate(-1.2)
  if (f.radHits > 0) {
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.fillStyle = 'rgba(220,255,40,0.4)'
    ctx.beginPath()
    ctx.ellipse(0, -48, 36, 52, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
  if (f.flash > 0 && f.flash % 2 === 0) ctx.globalAlpha = 0.4
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(img, -SPRITE_ORIGIN_X, -SPRITE_ORIGIN_Y)
  ctx.restore()
  return true
}

export function getPortrait(id: CharId): HTMLImageElement | undefined {
  return bank.chars[id].portrait
}
