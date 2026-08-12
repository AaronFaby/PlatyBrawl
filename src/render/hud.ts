import { CHAR_META, FONT, LOGICAL_W, MAX_HP, WINS_NEEDED } from '../config.ts'
import type { FightWorld } from '../fight/match.ts'

export function drawHud(ctx: CanvasRenderingContext2D, world: FightWorld, t: number): void {
  const { match, fighters, session } = world
  drawBar(ctx, 24, 14, 176, fighters[0].hp / MAX_HP, '#ff3d5a', false)
  drawBar(ctx, LOGICAL_W - 24 - 176, 14, 176, fighters[1].hp / MAX_HP, '#3dc8ff', true)

  ctx.font = `8px ${FONT}`
  ctx.fillStyle = '#ffe27a'
  ctx.textAlign = 'left'
  ctx.fillText(CHAR_META[fighters[0].charId].short, 26, 38)
  ctx.textAlign = 'right'
  const p2Name = CHAR_META[fighters[1].charId].short
  ctx.fillText(p2Name, LOGICAL_W - 26, 38)
  if (session.p2Cpu) {
    const nameW = ctx.measureText(p2Name).width
    ctx.font = `6px ${FONT}`
    ctx.fillStyle = '#9ad0ff'
    ctx.fillText('CPU', LOGICAL_W - 26 - nameW - 6, 37)
    ctx.font = `8px ${FONT}`
  }

  drawPips(ctx, 26, 50, match.wins[0], '#ff6b6b')
  drawPips(ctx, LOGICAL_W - 26 - (WINS_NEEDED * 10 - 2), 50, match.wins[1], '#6bc8ff')

  // timer plaque
  ctx.fillStyle = '#1a1018'
  ctx.fillRect(LOGICAL_W / 2 - 18, 8, 36, 22)
  ctx.strokeStyle = '#e8c36a'
  ctx.lineWidth = 2
  ctx.strokeRect(LOGICAL_W / 2 - 18, 8, 36, 22)
  ctx.fillStyle = match.timer <= 10 && Math.floor(t / 8) % 2 === 0 ? '#ff4d4d' : '#fff4c8'
  ctx.font = `12px ${FONT}`
  ctx.textAlign = 'center'
  ctx.fillText(String(match.timer).padStart(2, '0'), LOGICAL_W / 2, 25)

  if (match.announce) {
    ctx.save()
    ctx.textAlign = 'center'
    ctx.font = `18px ${FONT}`
    ctx.fillStyle = 'rgba(0,0,0,0.45)'
    ctx.fillText(match.announce, LOGICAL_W / 2 + 2, 130 + 2)
    ctx.fillStyle = match.announce === 'K.O.' || match.announce === 'TIME' ? '#ffd24a' : '#fff'
    ctx.fillText(match.announce, LOGICAL_W / 2, 130)
    ctx.restore()
  }
}

function drawBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  pct: number,
  fill: string,
  flip: boolean,
): void {
  ctx.fillStyle = '#140c10'
  ctx.fillRect(x - 2, y - 2, w + 4, 14)
  ctx.strokeStyle = '#e8c36a'
  ctx.lineWidth = 2
  ctx.strokeRect(x - 2, y - 2, w + 4, 14)
  ctx.fillStyle = '#3a2028'
  ctx.fillRect(x, y, w, 10)
  const fw = Math.max(0, Math.floor(w * Math.max(0, Math.min(1, pct))))
  ctx.fillStyle = fill
  if (flip) ctx.fillRect(x + w - fw, y, fw, 10)
  else ctx.fillRect(x, y, fw, 10)
  ctx.fillStyle = 'rgba(255,255,255,0.25)'
  ctx.fillRect(flip ? x + w - fw : x, y, fw, 3)
}

function drawPips(ctx: CanvasRenderingContext2D, x: number, y: number, n: number, color: string): void {
  for (let i = 0; i < WINS_NEEDED; i++) {
    ctx.fillStyle = i < n ? color : '#2a2020'
    ctx.beginPath()
    ctx.arc(x + i * 10 + 3, y, 3, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#e8c36a'
    ctx.lineWidth = 1
    ctx.stroke()
  }
}

export function drawSparks(ctx: CanvasRenderingContext2D, world: FightWorld, camX: number): void {
  for (const s of world.match.sparks) {
    const a = s.life / s.max
    ctx.save()
    ctx.translate(s.x - camX, s.y)
    ctx.fillStyle = `rgba(255,240,180,${a})`
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2
      const r = (1 - a) * 12 + 2
      ctx.fillRect(Math.cos(ang) * r, Math.sin(ang) * r, 3, 3)
    }
    ctx.fillStyle = `rgba(255,80,80,${a})`
    ctx.fillRect(-2, -2, 4, 4)
    ctx.restore()
  }
}

export function drawProjectiles(ctx: CanvasRenderingContext2D, world: FightWorld, camX: number): void {
  for (const p of world.match.projectiles) {
    if (p.kind === 'shuriken') {
      ctx.save()
      ctx.translate(p.x - camX, p.y)
      ctx.rotate(p.life * 0.4 * p.facing)
      ctx.fillStyle = '#d0d4dc'
      ctx.fillRect(-5, -2, 10, 4)
      ctx.fillRect(-2, -5, 4, 10)
      ctx.fillStyle = '#1a1010'
      ctx.fillRect(-1, -1, 2, 2)
      ctx.restore()
    } else {
      const x = p.facing === 1 ? p.x - camX : p.x - camX - p.w
      const grd = ctx.createLinearGradient(x, 0, x + p.w, 0)
      grd.addColorStop(0, 'rgba(80,240,255,0.1)')
      grd.addColorStop(0.4, 'rgba(80,240,255,0.85)')
      grd.addColorStop(1, 'rgba(200,255,255,0.2)')
      ctx.fillStyle = grd
      ctx.fillRect(x, p.y - p.h / 2, p.w, p.h)
    }
  }
}

export function drawControlCard(ctx: CanvasRenderingContext2D, y: number): void {
  ctx.textAlign = 'center'
  ctx.font = `6px ${FONT}`
  ctx.fillStyle = '#c8b8d8'
  ctx.fillText('P1  WASD  U/I PUNCH  J/K KICK', LOGICAL_W / 2, y)
  ctx.fillText('P2  ARROWS  O/P PUNCH  L/; KICK', LOGICAL_W / 2, y + 10)
  ctx.fillText('SPECIALS  QC+BTN   DP+P   CHARGE B+F+P', LOGICAL_W / 2, y + 20)
}


