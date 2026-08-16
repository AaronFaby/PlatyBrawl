import { FONT, LOGICAL_H, LOGICAL_W } from '../config.ts'
import type { CharId } from '../config.ts'
import { previewBgm } from '../audio/bgm.ts'
import { ac, sfxLock, sfxSelect } from '../audio/sfx.ts'
import { STAGE_IDS, STAGE_META, type StageId, type StagePick } from '../data/stages.ts'
import { pickTheme, themeName } from '../data/themes.ts'
import { ROSTER_ORDER, type Game, type Scene } from './context.ts'
import { bank } from '../render/sprite.ts'

const STAGE_CHOICES: StagePick[] = ['random', ...STAGE_IDS]
const MUSIC_CHOICES: Array<CharId | 'random'> = ['random', ...ROSTER_ORDER]

const THUMB_H = 36
const THUMB_GAP = 4
const STAGE_SHOWN = 5
const MUSIC_ROW = 16
const MUSIC_SHOWN = 8

export function arenaScene(game: Game): Scene {
  let pane = 0
  let si = 0
  let mi = 0
  let prevH = 5
  let prevV = 5
  let hold = 0

  return {
    id: 'arena',
    enter() {
      pane = 1
      si = 0
      mi = 0
      prevH = 5
      prevV = 5
      hold = 0
      previewMusic(mi)
    },
    exit() {},
    update() {
      ac()
      const d = game.p1.dir
      const h = d === 6 ? 1 : d === 4 ? -1 : 0
      const v = d === 8 ? -1 : d === 2 ? 1 : 0
      if (h && prevH === 5) {
        pane = (pane + h + 2) % 2
        sfxSelect()
        if (pane === 1) previewMusic(mi)
      }
      prevH = h ? d : 5
      if (v) {
        hold += 1
        if (prevV === 5 || hold % 14 === 0) {
          if (pane === 0) si = (si + v + STAGE_CHOICES.length) % STAGE_CHOICES.length
          else {
            mi = (mi + v + MUSIC_CHOICES.length) % MUSIC_CHOICES.length
            previewMusic(mi)
          }
          sfxSelect()
        }
      } else hold = 0
      prevV = v ? d : 5

      if (game.p1.lkPress) {
        game.switchTo('select')
        return
      }
      if (game.p1.punchPress || game.p1.startPress) {
        const stage = STAGE_CHOICES[si]
        const music = MUSIC_CHOICES[mi]
        game.session.stageId = stage
        game.session.bgmId = music === 'random' ? pickTheme() : music
        sfxLock()
        game.switchTo('versus')
      }
    },
    draw(ctx) {
      ctx.fillStyle = '#0c0612'
      ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H)
      ctx.textAlign = 'center'
      ctx.font = `10px ${FONT}`
      ctx.fillStyle = '#ffe14a'
      ctx.fillText('STAGE / MUSIC', LOGICAL_W / 2, 16)

      ctx.font = `6px ${FONT}`
      ctx.fillStyle = pane === 0 ? '#ff4d8d' : '#8a7088'
      ctx.fillText('STAGE', 118, 30)
      ctx.fillStyle = pane === 1 ? '#3dc8ff' : '#8a7088'
      ctx.fillText('MUSIC', 350, 30)

      drawStages(ctx, si, pane === 0)
      drawMusic(ctx, mi, pane === 1)

      ctx.textAlign = 'center'
      ctx.font = `6px ${FONT}`
      ctx.fillStyle = '#c8b8d8'
      ctx.fillText('A/D COLUMN   W/S HIGHLIGHT SONG   U LOCK   J BACK', LOGICAL_W / 2, 262)
    },
  }
}

function previewMusic(index: number): void {
  const id = MUSIC_CHOICES[index]
  previewBgm(id === 'random' ? 'title' : id)
}

function stageScroll(index: number): number {
  const max = Math.max(0, STAGE_CHOICES.length - STAGE_SHOWN)
  return Math.max(0, Math.min(max, index - 1))
}

function musicScroll(index: number): number {
  const max = Math.max(0, MUSIC_CHOICES.length - MUSIC_SHOWN)
  return Math.max(0, Math.min(max, index - 1))
}

function drawStages(ctx: CanvasRenderingContext2D, selected: number, active: boolean): void {
  const scroll = stageScroll(selected)
  const x = 12
  const w = 212
  for (let n = 0; n < STAGE_SHOWN; n++) {
    const i = scroll + n
    if (i >= STAGE_CHOICES.length) break
    const y = 36 + n * (THUMB_H + THUMB_GAP)
    const id = STAGE_CHOICES[i]
    const on = i === selected
    ctx.fillStyle = '#1a1020'
    ctx.fillRect(x, y, w, THUMB_H)
    ctx.strokeStyle = on ? (active ? '#ffe14a' : '#ff4d8d') : '#4a3050'
    ctx.lineWidth = on ? 2 : 1
    ctx.strokeRect(x, y, w, THUMB_H)
    if (id === 'random') {
      ctx.fillStyle = '#2a1830'
      ctx.fillRect(x + 2, y + 2, w - 4, THUMB_H - 4)
      ctx.textAlign = 'center'
      ctx.font = `8px ${FONT}`
      ctx.fillStyle = '#fff4c8'
      ctx.fillText('RANDOM', x + w / 2, y + 24)
    } else {
      drawThumb(ctx, id, x + 2, y + 2, w - 4, THUMB_H - 4)
      ctx.fillStyle = 'rgba(8,4,14,0.55)'
      ctx.fillRect(x + 2, y + THUMB_H - 14, w - 4, 12)
      ctx.textAlign = 'center'
      ctx.font = `6px ${FONT}`
      ctx.fillStyle = '#fff4c8'
      ctx.fillText(STAGE_META[id].name, x + w / 2, y + THUMB_H - 5)
    }
  }
}

function drawMusic(ctx: CanvasRenderingContext2D, selected: number, active: boolean): void {
  const scroll = musicScroll(selected)
  const x = 240
  const w = 228
  for (let n = 0; n < MUSIC_SHOWN; n++) {
    const i = scroll + n
    if (i >= MUSIC_CHOICES.length) break
    const y = 36 + n * MUSIC_ROW
    const id = MUSIC_CHOICES[i]
    const on = i === selected
    ctx.fillStyle = on ? '#241028' : '#140c18'
    ctx.fillRect(x, y, w, MUSIC_ROW - 2)
    ctx.strokeStyle = on ? (active ? '#ffe14a' : '#3dc8ff') : '#4a3050'
    ctx.lineWidth = on ? 2 : 1
    ctx.strokeRect(x, y, w, MUSIC_ROW - 2)
    ctx.textAlign = 'left'
    ctx.font = `6px ${FONT}`
    ctx.fillStyle = on ? '#ffe14a' : '#c8b8d8'
    const label = id === 'random' ? 'RANDOM' : themeName(id)
    ctx.fillText((on ? '> ' : '  ') + label, x + 8, y + 11)
  }
}

function drawThumb(
  ctx: CanvasRenderingContext2D,
  id: StageId,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  const img = bank.stages[id]
  if (!img) {
    ctx.fillStyle = '#2a1830'
    ctx.fillRect(x, y, w, h)
    return
  }
  ctx.imageSmoothingEnabled = false
  const srcW = img.naturalWidth || img.width
  const srcH = img.naturalHeight || img.height
  const scale = Math.max(w / srcW, h / srcH)
  const dw = srcW * scale
  const dh = srcH * scale
  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, w, h)
  ctx.clip()
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh)
  ctx.restore()
}
