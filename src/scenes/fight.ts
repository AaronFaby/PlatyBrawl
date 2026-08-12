import { LOGICAL_H, LOGICAL_W } from '../config.ts'
import { createCpu, resetCpu, tickCpu } from '../ai/cpu.ts'
import { clearKeys } from '../input/devices.ts'
import { emptyInput } from '../input/virtual.ts'
import { sfxBlock, sfxFight, sfxHit, sfxJump, sfxKo, sfxSpecial, sfxWhoosh } from '../audio/sfx.ts'
import { ensureBgm } from '../audio/bgm.ts'
import { createMatch, tickMatch, type FightWorld } from '../fight/match.ts'
import { createCam, updateCam } from '../render/camera.ts'
import { drawDebug } from '../render/debug.ts'
import { drawHud, drawProjectiles, drawSparks } from '../render/hud.ts'
import { drawFighter } from '../render/platy.ts'
import { drawStage } from '../render/stage.ts'
import type { Game, Scene } from './context.ts'

export function fightScene(game: Game): Scene {
  let world: FightWorld
  let lastHp: [number, number] = [1000, 1000]
  let lastAnnounce = ''
  let lastProj = 0
  let lastStatus: [string, string] = ['idle', 'idle']

  return {
    id: 'fight',
    enter() {
      world = createMatch(game.session)
      game.world = world
      game.cam = createCam()
      game.cpu = createCpu()
      resetCpu(game.cpu)
      clearKeys(game.devices)
      game.p1 = emptyInput()
      game.p2 = emptyInput()
      lastHp = [1000, 1000]
      lastAnnounce = ''
      lastProj = 0
      lastStatus = ['idle', 'idle']
      ensureBgm('fight')
    },
    exit() {},
    update() {
      const keys = game.devices.down
      const p1 = { ...game.p1 }
      if (!keys.has('KeyA') && !keys.has('KeyD') && !keys.has('KeyW') && !keys.has('KeyS')) {
        p1.dir = 5
      }
      let p2 = game.p2
      if (game.session.p2Cpu) p2 = tickCpu(game.cpu, world.fighters[1], world.fighters[0])
      else if (
        !keys.has('ArrowLeft') &&
        !keys.has('ArrowRight') &&
        !keys.has('ArrowUp') &&
        !keys.has('ArrowDown')
      ) {
        p2 = { ...p2, dir: 5 }
      }
      tickMatch(world, [p1, p2], game.devices.debugDummyBlock)
      updateCam(game.cam, world.fighters[0], world.fighters[1])

      for (const f of world.fighters) {
        const prev = lastStatus[f.id]
        if (f.status === 'jump' && prev !== 'jump') sfxJump()
        if (f.status === 'block' && prev !== 'block') sfxBlock()
        if (f.status === 'special' && prev !== 'special') sfxSpecial()
        if ((f.status === 'attack' || f.status === 'special') && f.frameIndex === 1 && f.frameTicks === 0) {
          sfxWhoosh()
        }
        lastStatus[f.id] = f.status
      }
      if (world.fighters[0].hp < lastHp[0] || world.fighters[1].hp < lastHp[1]) sfxHit()
      lastHp = [world.fighters[0].hp, world.fighters[1].hp]
      if (world.match.announce === 'FIGHT' && lastAnnounce !== 'FIGHT') sfxFight()
      if (world.match.announce === 'K.O.' && lastAnnounce !== 'K.O.') sfxKo()
      lastAnnounce = world.match.announce
      if (world.match.projectiles.length > lastProj) sfxWhoosh()
      lastProj = world.match.projectiles.length

      if (world.match.phase === 'over') {
        game.switchTo('result', { winner: world.match.winner, world })
      }
    },
    draw(ctx) {
      const shake = world.match.shake
      const sx = shake > 0 ? (Math.random() - 0.5) * shake * 2 : 0
      const sy = shake > 0 ? (Math.random() - 0.5) * shake * 2 : 0
      ctx.save()
      ctx.translate(sx, sy)
      drawStage(ctx, game.cam, game.tick)
      const order = [...world.fighters].sort((a, b) => a.y - b.y)
      for (const f of order) drawFighter(ctx, f, game.cam, game.tick)
      drawProjectiles(ctx, world, game.cam.x)
      drawSparks(ctx, world, game.cam.x)
      ctx.restore()
      drawHud(ctx, world, game.tick)
      if (game.devices.debugHitboxes) drawDebug(ctx, world, game.cam)
      void LOGICAL_W
      void LOGICAL_H
    },
  }
}
