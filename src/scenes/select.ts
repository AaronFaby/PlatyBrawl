import { CHAR_META, FONT, LOGICAL_H, LOGICAL_W } from '../config.ts'
import type { CharId } from '../config.ts'
import { ac, sfxLock, sfxSelect } from '../audio/sfx.ts'
import { ensureBgm } from '../audio/bgm.ts'
import { SPECIAL_LINES } from '../data/moves.ts'
import { pickCpuOpponent } from '../data/roster.ts'
import { nextSkin, sessionSkin, shiftHex, type SkinId } from '../data/skins.ts'
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
  let s1: SkinId = 0
  let s2: SkinId = 0

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
      s1 = sessionSkin(game.session.p1Skin)
      s2 = sessionSkin(game.session.p2Skin)
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
      const p2WasHuman = p2Human
      if (!p2Human && !lock1 && p2WantsJoin(game.devices)) {
        p2Human = true
        sfxSelect()
      }

      if (p2Human && !lock2 && h2) {
        hold2 += 1
        if (prev2 === 5 || hold2 % 16 === 0) {
          c2 = (c2 + h2 + ROSTER_ORDER.length) % ROSTER_ORDER.length
          sfxSelect()
        }
      } else hold2 = 0
      prev2 = p2Human && h2 ? d2 : 5

      if (!lock1 && game.p1.colorPress) {
        s1 = nextSkin(s1)
        sfxSelect()
      }
      if (p2Human && !lock2 && game.p2.colorPress) {
        s2 = nextSkin(s2)
        sfxSelect()
      }

      if (!lock1 && (game.p1.punchPress || game.p1.startPress || game.p1.kickPress)) {
        lock1 = true
        sfxLock()
        if (!p2Human) {
          const cpuId = pickCpuOpponent(ROSTER_ORDER[c1])
          c2 = ROSTER_ORDER.indexOf(cpuId)
          lock2 = true
        }
      }
      if (p2WasHuman && !lock2 && (game.p2.punchPress || game.p2.kickPress)) {
        lock2 = true
        sfxLock()
      }

      if (lock1 && lock2) {
        if (p2Human && ROSTER_ORDER[c1] === ROSTER_ORDER[c2] && s1 === s2) s2 = nextSkin(s2)
        game.session.p1 = ROSTER_ORDER[c1]
        game.session.p2 = ROSTER_ORDER[c2]
        game.session.p2Cpu = !p2Human
        game.session.p1Skin = s1
        game.session.p2Skin = s2
        game.switchTo('arena')
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
      const gap = n >= 5 ? 6 : 12
      const cardW = Math.min(100, Math.floor((LOGICAL_W - 16 - (n - 1) * gap) / n))
      const startX = Math.floor((LOGICAL_W - (n * cardW + (n - 1) * gap)) / 2)
      ROSTER_ORDER.forEach((id, i) => {
        const x = startX + i * (cardW + gap)
        const y = 70
        const p1 = i === c1
        const p2 = p2Human ? i === c2 : lock2 && i === c2
        drawCard(ctx, id, x, y, cardW, {
          p1,
          p2,
          l1: lock1 && i === c1,
          l2: lock2 && i === c2,
          cpu: !p2Human && lock2 && i === c2,
          skin: p1 ? s1 : p2 ? s2 : 0,
          skin2: p1 && p2 ? s2 : undefined,
        })
      })

      ctx.font = `7px ${FONT}`
      ctx.fillStyle = '#ff8aa8'
      ctx.fillText(lock1 ? 'P1 LOCKED' : 'P1  A/D PICK  Q COLOR  U LOCK', LOGICAL_W / 2, 230)
      const cpuHard = game.session.cpuDifficulty === 'hard'
      ctx.fillStyle = p2Human ? '#8ad4ff' : cpuHard ? '#ff8a4a' : '#8ad4ff'
      ctx.fillText(
        p2Human
          ? lock2
            ? 'P2 LOCKED'
            : 'P2  ARROWS PICK  / COLOR  O LOCK'
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
  w: number,
  mark: { p1: boolean; p2: boolean; l1: boolean; l2: boolean; cpu: boolean; skin: SkinId; skin2?: SkinId },
): void {
  const { p1, p2, l1, l2, cpu, skin, skin2 } = mark
  const meta = CHAR_META[id]
  const h = w >= 96 ? 130 : 118
  ctx.fillStyle = '#1a1020'
  ctx.fillRect(x, y, w, h)
  ctx.strokeStyle = p1 && p2 ? '#ffe14a' : p1 ? '#ff4d8d' : p2 ? '#3dc8ff' : '#4a3050'
  ctx.lineWidth = p1 || p2 ? 3 : 1
  ctx.strokeRect(x, y, w, h)

  const pad = 8
  const face = Math.min(80, w - pad * 2)
  const fx = x + Math.floor((w - face) / 2)
  const fy = y + 16
  const split = skin2 != null && skin2 !== skin
  const left = getPortrait(id, skin)
  const right = split ? getPortrait(id, skin2) : undefined
  ctx.imageSmoothingEnabled = false
  if (left && right) {
    const sw = sourceW(left)
    const sh = sourceH(left)
    const mid = Math.floor(sw / 2)
    const destMid = Math.floor(face / 2)
    ctx.drawImage(left, 0, 0, mid, sh, fx, fy, destMid, face)
    ctx.drawImage(right, mid, 0, sw - mid, sh, fx + destMid, fy, face - destMid, face)
  } else if (left) {
    ctx.drawImage(left, fx, fy, face, face)
  } else {
    ctx.fillStyle = shiftHex(meta.color, id, skin)
    ctx.beginPath()
    ctx.ellipse(x + w / 2, y + 16 + face / 2, face * 0.35, face * 0.4, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.textAlign = 'center'
  ctx.font = `7px ${FONT}`
  ctx.fillStyle = '#fff4c8'
  ctx.fillText(meta.short, x + w / 2, y + h - 22)
  ctx.fillStyle = '#c8b8d8'
  ctx.font = `6px ${FONT}`
  ctx.fillText(meta.subtitle, x + w / 2, y + h - 10)

  if (p1) {
    ctx.fillStyle = l1 ? '#ff4d8d' : '#ff8aa8'
    ctx.font = `8px ${FONT}`
    ctx.fillText('P1', x + 16, y + 14)
  }
  if (p2) {
    ctx.fillStyle = l2 ? '#3dc8ff' : '#9ad0ff'
    ctx.font = `8px ${FONT}`
    ctx.fillText(cpu ? 'CPU' : 'P2', x + w - 16, y + 14)
  }
}

function sourceW(img: CanvasImageSource): number {
  if (img instanceof HTMLImageElement) return img.naturalWidth || img.width
  if (img instanceof HTMLCanvasElement) return img.width
  return 128
}

function sourceH(img: CanvasImageSource): number {
  if (img instanceof HTMLImageElement) return img.naturalHeight || img.height
  if (img instanceof HTMLCanvasElement) return img.height
  return 128
}
