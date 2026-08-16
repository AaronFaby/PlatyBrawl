import { CHAR_META, FONT, LOGICAL_H, LOGICAL_W, MAX_HP, WINS_NEEDED } from '../config.ts'
import { isMuted } from '../audio/engine.ts'
import { MOVESET } from '../data/moves.ts'
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
    const hard = session.cpuDifficulty === 'hard'
    ctx.font = `6px ${FONT}`
    ctx.fillStyle = hard ? '#ff8a4a' : '#9ad0ff'
    ctx.fillText(hard ? 'HARD' : 'CPU', LOGICAL_W - 26 - nameW - 6, 37)
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

  ctx.font = `5px ${FONT}`
  ctx.fillStyle = '#6a5068'
  ctx.textAlign = 'left'
  ctx.fillText('H MOVES', 8, LOGICAL_H - 6)
}

export function drawMusicStatus(ctx: CanvasRenderingContext2D): void {
  const on = !isMuted()
  ctx.save()
  ctx.textAlign = 'right'
  ctx.font = `5px ${FONT}`
  ctx.fillStyle = on ? '#8ad4a0' : '#6a5068'
  ctx.fillText(on ? 'MUSIC: ON' : 'MUSIC: OFF', LOGICAL_W - 6, LOGICAL_H - 6)
  ctx.restore()
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
    } else if (p.kind === 'bullet') {
      ctx.save()
      ctx.translate(p.x - camX, p.y)
      ctx.fillStyle = '#ffe27a'
      ctx.fillRect(p.facing === 1 ? -8 : -4, -1, 12, 3)
      ctx.fillStyle = '#fff4c8'
      ctx.fillRect(p.facing === 1 ? -2 : -2, -2, 5, 5)
      ctx.restore()
    } else if (p.kind === 'chain') {
      const owner = world.fighters[p.owner]
      const ox = owner.x - camX + owner.facing * 22
      const oy = owner.y - 46
      const tx = p.x - camX
      const ty = p.y
      const dx = tx - ox
      const dy = ty - oy
      const len = Math.hypot(dx, dy)
      const n = Math.max(1, Math.floor(len / 6))
      for (let i = 0; i <= n; i++) {
        const t = i / n
        ctx.fillStyle = i % 2 === 0 ? '#c8c4b8' : '#6a6458'
        ctx.fillRect(ox + dx * t - 2, oy + dy * t - 2, 4, 4)
      }
      ctx.fillStyle = '#d8d0c0'
      ctx.fillRect(tx - 4, ty - 3, 8, 6)
      ctx.fillStyle = '#8a4030'
      ctx.fillRect(tx + (p.facing > 0 ? 2 : -5), ty - 2, 4, 4)
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
  ctx.fillText('AFTER SELECT  STAGE + MUSIC   RANDOM DEFAULT', LOGICAL_W / 2, y + 20)
  ctx.fillText('IN FIGHT  H  PAUSE + MOVES', LOGICAL_W / 2, y + 30)
}

export function drawMovesOverlay(ctx: CanvasRenderingContext2D, world: FightWorld): void {
  ctx.fillStyle = 'rgba(8,4,14,0.82)'
  ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H)
  ctx.textAlign = 'center'
  ctx.font = `12px ${FONT}`
  ctx.fillStyle = '#ffe14a'
  ctx.fillText('PAUSED', LOGICAL_W / 2, 22)
  ctx.font = `6px ${FONT}`
  ctx.fillStyle = '#c8b8d8'
  ctx.fillText('MOVESET', LOGICAL_W / 2, 34)

  drawMovesCard(ctx, world.fighters[0].charId, 16, 46, '#ff4d8d', 'P1')
  drawMovesCard(
    ctx,
    world.fighters[1].charId,
    248,
    46,
    '#3dc8ff',
    world.session.p2Cpu ? (world.session.cpuDifficulty === 'hard' ? 'HARD' : 'CPU') : 'P2',
  )

  ctx.textAlign = 'center'
  ctx.font = `6px ${FONT}`
  ctx.fillStyle = '#fff4c8'
  ctx.fillText('H  OR  ESC  RESUME', LOGICAL_W / 2, LOGICAL_H - 10)
}

function drawMovesCard(
  ctx: CanvasRenderingContext2D,
  id: keyof typeof MOVESET,
  x: number,
  y: number,
  accent: string,
  tag: string,
): void {
  const meta = CHAR_META[id]
  ctx.fillStyle = '#140c18'
  ctx.fillRect(x, y, 216, 196)
  ctx.strokeStyle = accent
  ctx.lineWidth = 2
  ctx.strokeRect(x, y, 216, 196)
  ctx.textAlign = 'left'
  ctx.font = `8px ${FONT}`
  ctx.fillStyle = accent
  ctx.fillText(tag, x + 10, y + 16)
  ctx.fillStyle = '#fff4c8'
  ctx.fillText(meta.short, x + 48, y + 16)
  ctx.font = `6px ${FONT}`
  ctx.fillStyle = '#c8b8d8'
  ctx.fillText(meta.subtitle, x + 10, y + 30)
  MOVESET[id].forEach((line, i) => {
    ctx.fillStyle = i < 2 ? '#9a8aa8' : '#ffe27a'
    ctx.fillText(line, x + 10, y + 50 + i * 18)
  })
}


