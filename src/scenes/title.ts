import { FONT, LOGICAL_H, LOGICAL_W, VERSION } from '../config.ts'
import type { CharId } from '../config.ts'
import { armTitleAttract, cancelTitleAttract, speakTitle } from '../audio/announce.ts'
import { ac, audioReady, sfxStart } from '../audio/sfx.ts'
import { ensureBgm } from '../audio/bgm.ts'
import { drawControlCard } from '../render/hud.ts'
import { bank, opaqueRect } from '../render/sprite.ts'
import { ROSTER_ORDER, type Game, type Scene } from './context.ts'

const TITLE_FIGHTER_H = 50
const LOGO_CX = LOGICAL_W / 2
const LOGO_CY = 108

export function titleScene(game: Game): Scene {
  let flash = 0
  let slam = -1
  return {
    id: 'title',
    enter() {
      flash = 0
      slam = -1
      armTitleAttract()
    },
    exit() {
      cancelTitleAttract()
    },
    update() {
      flash += 1
      if (game.p1.startPress || game.p1.lpPress || game.p1.punchPress) {
        ac()
        sfxStart()
        game.switchTo('select')
        return
      }
      if (slam < 0 && bank.ready) slam = 0
      if (slam >= 0) slam += 1
      if (audioReady()) {
        ensureBgm('title')
        speakTitle()
      }
    },
    draw(ctx) {
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

      if (slam >= 0 && slam < 8) {
        ctx.fillStyle = `rgba(255,244,200,${0.2 * (1 - slam / 8)})`
        ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H)
      }

      ctx.textAlign = 'center'
      ctx.font = `10px ${FONT}`
      ctx.fillStyle = '#ff4d8d'
      ctx.fillText('90s ARCADE FIGHTER', LOGICAL_W / 2, 42)

      const t = slam < 0 ? 1 : Math.min(1, slam / 16)
      const punch = slam < 0 ? 1 : 1 + (1 - t) * (1 - t) * 0.42
      ctx.save()
      ctx.translate(LOGO_CX, LOGO_CY)
      ctx.scale(punch, punch)
      ctx.translate(-LOGO_CX, -LOGO_CY)
      ctx.font = `28px ${FONT}`
      ctx.fillStyle = '#3a1020'
      ctx.fillText('PLATY', LOGICAL_W / 2 + 3, 92)
      ctx.fillStyle = '#ffe14a'
      ctx.fillText('PLATY', LOGICAL_W / 2, 90)
      ctx.fillStyle = '#3a1020'
      ctx.fillText('BRAWL', LOGICAL_W / 2 + 3, 128)
      ctx.fillStyle = '#ff3d7f'
      ctx.fillText('BRAWL', LOGICAL_W / 2, 126)
      ctx.restore()

      const spacing = ROSTER_ORDER.length >= 6 ? 70 : ROSTER_ORDER.length >= 5 ? 80 : 90
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
      ctx.fillText('FIRST TO 2   LOCAL + CPU', LOGICAL_W / 2, 266)

      ctx.save()
      ctx.textAlign = 'right'
      ctx.font = `6px ${FONT}`
      ctx.fillStyle = '#6a5068'
      ctx.fillText(`v${VERSION}`, LOGICAL_W - 8, 14)
      ctx.restore()
    },
  }
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
