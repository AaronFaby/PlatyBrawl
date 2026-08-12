import { CHAR_META, FONT, LOGICAL_H, LOGICAL_W } from '../config.ts'
import { sfxWin } from '../audio/sfx.ts'
import { ensureBgm } from '../audio/bgm.ts'
import type { FightWorld } from '../fight/match.ts'
import type { PlayerId } from '../fight/types.ts'
import { drawFighter } from '../render/platy.ts'
import { createCam } from '../render/camera.ts'
import type { Game, Scene } from './context.ts'

type ResultData = { winner: PlayerId | null; world: FightWorld }

export function resultScene(game: Game): Scene {
  let data: ResultData | null = null
  let cursor = 0
  let prevDir = 5
  const items = ['REMATCH', 'CHARACTER SELECT', 'TITLE']

  return {
    id: 'result',
    enter(payload) {
      data = (payload as ResultData) ?? null
      cursor = 0
      prevDir = 5
      sfxWin()
      ensureBgm('win')
    },
    exit() {},
    update() {
      const dir = game.p1.dir
      if (dir !== prevDir) {
        if (dir === 8) cursor = (cursor + 2) % 3
        if (dir === 2) cursor = (cursor + 1) % 3
        prevDir = dir
      }
      if (dir === 5) prevDir = 5
      if (game.p1.startPress || game.p1.punchPress) {
        if (cursor === 0) game.switchTo('versus')
        else if (cursor === 1) game.switchTo('select')
        else game.switchTo('title')
      }
    },
    draw(ctx) {
      ctx.fillStyle = '#0a0610'
      ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H)
      ctx.textAlign = 'center'
      ctx.font = `14px ${FONT}`
      ctx.fillStyle = '#ffe14a'
      let title = 'DRAW'
      if (data?.winner === 0) title = 'P1 WIN'
      if (data?.winner === 1) title = game.session.p2Cpu ? 'CPU WIN' : 'P2 WIN'
      ctx.fillText(title, LOGICAL_W / 2, 40)

      if (data) {
        const w = data.winner !== null ? data.world.fighters[data.winner] : data.world.fighters[0]
        w.status = 'win'
        w.anim = 'win'
        const cam = createCam()
        cam.x = w.x - LOGICAL_W / 2
        drawFighter(ctx, w, cam, game.tick)
        ctx.font = `8px ${FONT}`
        ctx.fillStyle = '#fff4c8'
        ctx.fillText(CHAR_META[w.charId].name, LOGICAL_W / 2, 200)
      }

      items.forEach((label, i) => {
        ctx.font = `8px ${FONT}`
        ctx.fillStyle = i === cursor ? '#ff4d8d' : '#8a7088'
        ctx.fillText((i === cursor ? '> ' : '  ') + label, LOGICAL_W / 2, 220 + i * 14)
      })
    },
  }
}
