import { CHAR_META, FONT, LOGICAL_H, LOGICAL_W } from '../config.ts'
import { sfxStart } from '../audio/sfx.ts'
import { getPortrait } from '../render/sprite.ts'
import type { Game, Scene } from './context.ts'

export function versusScene(game: Game): Scene {
  let ticks = 0
  return {
    id: 'versus',
    enter() {
      ticks = 0
      sfxStart()
    },
    exit() {},
    update() {
      ticks += 1
      if (ticks > 90) game.switchTo('fight')
    },
    draw(ctx) {
      ctx.fillStyle = '#08040c'
      ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H)
      const p1 = CHAR_META[game.session.p1]
      const p2 = CHAR_META[game.session.p2]
      ctx.textAlign = 'center'
      ctx.font = `10px ${FONT}`
      ctx.fillStyle = '#ff8aa8'
      ctx.fillText(p1.name, 130, 80)
      ctx.fillStyle = '#8ad4ff'
      ctx.fillText(p2.name, 350, 80)
      ctx.font = `8px ${FONT}`
      ctx.fillStyle = '#c8b8d8'
      ctx.fillText(p1.subtitle, 130, 96)
      const cpuTag = game.session.p2Cpu
        ? game.session.cpuDifficulty === 'hard'
          ? 'HARD '
          : 'CPU '
        : ''
      ctx.fillText(cpuTag + p2.subtitle, 350, 96)

      const port1 = getPortrait(game.session.p1)
      const port2 = getPortrait(game.session.p2)
      if (port1) ctx.drawImage(port1, 82, 112, 96, 96)
      else {
        ctx.fillStyle = p1.color
        ctx.beginPath()
        ctx.ellipse(130, 160, 36, 40, 0, 0, Math.PI * 2)
        ctx.fill()
      }
      if (port2) ctx.drawImage(port2, 302, 112, 96, 96)
      else {
        ctx.fillStyle = p2.color
        ctx.beginPath()
        ctx.ellipse(350, 160, 36, 40, 0, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.font = `28px ${FONT}`
      ctx.fillStyle = '#ffe14a'
      ctx.fillText('VS', LOGICAL_W / 2, 168)
    },
  }
}
