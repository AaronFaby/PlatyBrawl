import { FONT, LOGICAL_H, LOGICAL_W, VERSION } from '../config.ts'
import type { CharId } from '../config.ts'
import { ac, isMuted, sfxStart } from '../audio/sfx.ts'
import { ensureBgm } from '../audio/bgm.ts'
import { drawControlCard } from '../render/hud.ts'
import { bank } from '../render/sprite.ts'
import { ROSTER_ORDER, type Game, type Scene } from './context.ts'

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

      const spacing = 90
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
      ctx.fillText(`FIRST TO 2   LOCAL + CPU   M ${isMuted() ? 'MUSIC OFF' : 'MUSIC ON'}`, LOGICAL_W / 2, 266)

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

function drawTitleFighter(ctx: CanvasRenderingContext2D, id: CharId, x: number, y: number): void {
  const img = bank.chars[id].idle
  ctx.save()
  ctx.translate(x, y)
  ctx.fillStyle = 'rgba(0,0,0,0.35)'
  ctx.beginPath()
  ctx.ellipse(0, 4, 18, 4, 0, 0, Math.PI * 2)
  ctx.fill()
  if (img) {
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(img, -28, -54, 56, 56)
  }
  ctx.restore()
}
