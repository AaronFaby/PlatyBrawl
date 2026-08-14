import { CHAR_META, FONT, LOGICAL_H, LOGICAL_W } from '../config.ts'
import type { CharId } from '../config.ts'
import { ac, sfxLock, sfxSelect } from '../audio/sfx.ts'
import { ensureBgm } from '../audio/bgm.ts'
import { SPECIAL_LINES } from '../data/moves.ts'
import { pickCpuOpponent } from '../data/roster.ts'
import { p2WantsJoin } from '../input/devices.ts'
import { getPortrait } from '../render/sprite.ts'
import { ROSTER_ORDER, type Game, type Scene } from './context.ts'

export function selectScene(game: Game): Scene {
  let c1 = 0
  let c2 = 1
  let lock1 = false
  let lock2 = false
  let p2Human = false
  let prev1 = 5
  let prev2 = 5
  let prevV = 5
  let hold1 = 0
  let hold2 = 0

  return {
    id: 'select',
    enter() {
      c1 = ROSTER_ORDER.indexOf(game.session.p1)
      c2 = ROSTER_ORDER.indexOf(game.session.p2)
      if (c1 < 0) c1 = 0
      if (c2 < 0) c2 = 1
      lock1 = false
      lock2 = false
      p2Human = !game.session.p2Cpu
      prev1 = 5
      prev2 = 5
      prevV = 5
      hold1 = 0
      hold2 = 0
      if (!game.session.cpuDifficulty) game.session.cpuDifficulty = 'normal'
      ensureBgm('title')
    },
    exit() {},
    update() {
      ac()
      const d1 = game.p1.dir
      const d2 = game.p2.dir
      const h1 = d1 === 6 ? 1 : d1 === 4 ? -1 : 0
      const h2 = d2 === 6 ? 1 : d2 === 4 ? -1 : 0
      if (!lock1 && h1) {
        hold1 += 1
        if (prev1 === 5 || hold1 % 16 === 0) {
          c1 = (c1 + h1 + ROSTER_ORDER.length) % ROSTER_ORDER.length
          sfxSelect()
        }
      } else hold1 = 0
      prev1 = h1 ? d1 : 5
      const v1 = d1 === 8 || d1 === 2 ? d1 : 5
      if (!lock1 && !p2Human && v1 !== 5 && prevV === 5) {
        game.session.cpuDifficulty = game.session.cpuDifficulty === 'hard' ? 'normal' : 'hard'
        sfxSelect()
      }
      prevV = v1
      if (!lock1 && p2WantsJoin(game.devices)) {
        p2Human = true
      }

      if (p2Human && !lock2 && h2) {
        hold2 += 1
        if (prev2 === 5 || hold2 % 16 === 0) {
          c2 = (c2 + h2 + ROSTER_ORDER.length) % ROSTER_ORDER.length
          sfxSelect()
        }
      } else hold2 = 0
      prev2 = p2Human && h2 ? d2 : 5

      if (!lock1 && (game.p1.punchPress || game.p1.startPress || game.p1.kickPress)) {
        lock1 = true
        sfxLock()
        if (!p2Human) {
          const cpuId = pickCpuOpponent(ROSTER_ORDER[c1])
          c2 = ROSTER_ORDER.indexOf(cpuId)
          lock2 = true
        }
      }
      if (p2Human && !lock2 && (game.p2.punchPress || game.p2.kickPress)) {
        lock2 = true
        sfxLock()
      }

      if (lock1 && lock2) {
        game.session.p1 = ROSTER_ORDER[c1]
        game.session.p2 = ROSTER_ORDER[c2]
        game.session.p2Cpu = !p2Human
        game.switchTo('versus')
      }
    },
    draw(ctx) {
      ctx.fillStyle = '#0c0612'
      ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H)
      ctx.fillStyle = '#ff4d8d'
      ctx.font = `12px ${FONT}`
      ctx.textAlign = 'center'
      ctx.fillText('SELECT YOUR PLATY', LOGICAL_W / 2, 24)

      const n = ROSTER_ORDER.length
      const cardW = 100
      const gap = 12
      const startX = Math.floor((LOGICAL_W - (n * cardW + (n - 1) * gap)) / 2)
      ROSTER_ORDER.forEach((id, i) => {
        const x = startX + i * (cardW + gap)
        const y = 70
        drawCard(ctx, id, x, y, {
          p1: i === c1,
          p2: p2Human ? i === c2 : lock2 && i === c2,
          l1: lock1 && i === c1,
          l2: lock2 && i === c2,
          cpu: !p2Human && lock2 && i === c2,
        })
      })

      ctx.font = `7px ${FONT}`
      ctx.fillStyle = '#ff8aa8'
      ctx.fillText(lock1 ? 'P1 LOCKED' : 'P1  A/D  PICK YOU   U LOCK', LOGICAL_W / 2, 230)
      const cpuHard = game.session.cpuDifficulty === 'hard'
      ctx.fillStyle = p2Human ? '#8ad4ff' : cpuHard ? '#ff8a4a' : '#8ad4ff'
      ctx.fillText(
        p2Human
          ? lock2
            ? 'P2 LOCKED'
            : 'P2  ARROWS  PICK   O LOCK'
          : `CPU  ${cpuHard ? 'HARD' : 'NORMAL'}   W/S DIFF   O = HUMAN P2`,
        LOGICAL_W / 2,
        244,
      )
      const focused = ROSTER_ORDER[c1]
      ctx.fillStyle = '#c8b8d8'
      ctx.font = `6px ${FONT}`
      SPECIAL_LINES[focused].forEach((line, i) => ctx.fillText(line, LOGICAL_W / 2, 256 + i * 8))
    },
  }
}

function drawCard(
  ctx: CanvasRenderingContext2D,
  id: CharId,
  x: number,
  y: number,
  mark: { p1: boolean; p2: boolean; l1: boolean; l2: boolean; cpu: boolean },
): void {
  const { p1, p2, l1, l2, cpu } = mark
  const meta = CHAR_META[id]
  ctx.fillStyle = '#1a1020'
  ctx.fillRect(x, y, 100, 130)
  ctx.strokeStyle = p1 && p2 ? '#ffe14a' : p1 ? '#ff4d8d' : p2 ? '#3dc8ff' : '#4a3050'
  ctx.lineWidth = p1 || p2 ? 3 : 1
  ctx.strokeRect(x, y, 100, 130)

  const portrait = getPortrait(id)
  if (portrait) {
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(portrait, x + 10, y + 18, 80, 80)
  } else {
    ctx.fillStyle = meta.color
    ctx.beginPath()
    ctx.ellipse(x + 50, y + 62, 28, 32, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.textAlign = 'center'
  ctx.font = `7px ${FONT}`
  ctx.fillStyle = '#fff4c8'
  ctx.fillText(meta.short, x + 50, y + 108)
  ctx.fillStyle = '#c8b8d8'
  ctx.font = `6px ${FONT}`
  ctx.fillText(meta.subtitle, x + 50, y + 120)

  if (p1) {
    ctx.fillStyle = l1 ? '#ff4d8d' : '#ff8aa8'
    ctx.font = `8px ${FONT}`
    ctx.fillText('P1', x + 18, y + 16)
  }
  if (p2) {
    ctx.fillStyle = l2 ? '#3dc8ff' : '#9ad0ff'
    ctx.font = `8px ${FONT}`
    ctx.fillText(cpu ? 'CPU' : 'P2', x + 82, y + 16)
  }
}
