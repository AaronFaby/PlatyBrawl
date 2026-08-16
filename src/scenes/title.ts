import { FONT, LOGICAL_H, LOGICAL_W, VERSION } from '../config.ts'
import type { CharId } from '../config.ts'
import { ac, sfxStart } from '../audio/sfx.ts'
import { ensureBgm } from '../audio/bgm.ts'
import { drawControlCard } from '../render/hud.ts'
import { bank } from '../render/sprite.ts'
import { ROSTER_ORDER, type Game, type Scene } from './context.ts'

const TITLE_FIGHTER_H = 50

export function titleScene(game: Game): Scene {
  let flash = 0
  return {
    id: 'title',
    enter() {
      flash = 0
      ensureBgm('title')
    },
    exit() {},
    update() {
      flash += 1
      if (game.p1.startPress || game.p1.lpPress || game.p1.punchPress) {
        ac()
        ensureBgm('title')
        sfxStart()
        game.switchTo('select')
      }
    },
    draw(ctx) {
      const t = game.tick
      const bg = ctx.createLinearGradient(0, 0, 0, LOGICAL_H)
      bg.addColorStop(0, '#12061c')
      bg.addColorStop(0.55, '#2a0a28')
      bg.addColorStop(1, '#08040c')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H)

      // grid floor
      ctx.save()
      ctx.strokeStyle = 'rgba(255,60,140,0.28)'
      ctx.lineWidth = 1
      for (let i = 0; i < 12; i++) {
        const y = 170 + i * 10
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(LOGICAL_W, y)
        ctx.stroke()
      }
      for (let i = -8; i < 20; i++) {
        ctx.beginPath()
        ctx.moveTo(LOGICAL_W / 2 + i * 28, 170)
        ctx.lineTo(LOGICAL_W / 2 + i * 70, LOGICAL_H)
        ctx.stroke()
      }
      ctx.restore()

      ctx.textAlign = 'center'
      ctx.font = `10px ${FONT}`
      ctx.fillStyle = '#ff4d8d'
      ctx.fillText('90s ARCADE FIGHTER', LOGICAL_W / 2, 42)

      ctx.font = `28px ${FONT}`
      ctx.fillStyle = '#3a1020'
      ctx.fillText('PLATY', LOGICAL_W / 2 + 3, 92)
      ctx.fillStyle = '#ffe14a'
      ctx.fillText('PLATY', LOGICAL_W / 2, 90)
      ctx.fillStyle = '#3a1020'
      ctx.fillText('BRAWL', LOGICAL_W / 2 + 3, 128)
      ctx.fillStyle = '#ff3d7f'
      ctx.fillText('BRAWL', LOGICAL_W / 2, 126)

      const spacing = ROSTER_ORDER.length >= 5 ? 80 : 90
      const startX = LOGICAL_W / 2 - ((ROSTER_ORDER.length - 1) * spacing) / 2
      ROSTER_ORDER.forEach((id, i) => drawTitleFighter(ctx, id, startX + i * spacing, 196))

      ctx.font = `10px ${FONT}`
      ctx.globalAlpha = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(flash * 0.12))
      ctx.fillStyle = '#fff'
      ctx.fillText('PRESS START', LOGICAL_W / 2, 208)
      ctx.globalAlpha = 1

      drawControlCard(ctx, 224)
      ctx.fillStyle = '#6a5068'
      ctx.font = `6px ${FONT}`
      ctx.fillText('FIRST TO 2   LOCAL + CPU   M TOGGLE', LOGICAL_W / 2, 266)

      ctx.save()
      ctx.textAlign = 'right'
      ctx.font = `6px ${FONT}`
      ctx.fillStyle = '#6a5068'
      ctx.fillText(`v${VERSION}`, LOGICAL_W - 8, 14)
      ctx.restore()
      void t
    },
  }
}

type SrcRect = { x: number; y: number; w: number; h: number }
const opaqueCache = new WeakMap<HTMLImageElement, SrcRect>()

function opaqueRect(img: HTMLImageElement): SrcRect {
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
    const g = scratch.getContext('2d')
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

function drawTitleFighter(ctx: CanvasRenderingContext2D, id: CharId, x: number, y: number): void {
  const img = bank.chars[id].idle
  ctx.save()
  ctx.translate(x, y)
  const src = img ? opaqueRect(img) : { x: 0, y: 0, w: 56, h: TITLE_FIGHTER_H }
  const scale = TITLE_FIGHTER_H / src.h
  const dw = Math.round(src.w * scale)
  const dh = TITLE_FIGHTER_H
  ctx.fillStyle = 'rgba(0,0,0,0.35)'
  ctx.beginPath()
  ctx.ellipse(0, 4, Math.max(16, Math.round(dw * 0.32)), 4, 0, 0, Math.PI * 2)
  ctx.fill()
  if (img) {
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(img, src.x, src.y, src.w, src.h, -Math.floor(dw / 2), -dh, dw, dh)
  }
  ctx.restore()
}
