import '@fontsource/press-start-2p'
import './style.css'
import { FONT, LOGICAL_H, LOGICAL_W } from './config.ts'
import { emptyInput, latchPresses, stickToVirtual, withLatchedPresses } from './input/virtual.ts'
import { createDevices, readP1, readP2, refreshPads } from './input/devices.ts'
import { mountTouch } from './input/touch.ts'
import { startLoop } from './loop.ts'
import { createCam } from './render/camera.ts'
import { createView, present } from './render/canvas.ts'
import { createCpu } from './ai/cpu.ts'
import { DEFAULT_SESSION, type Game, type Scene, type SceneId } from './scenes/context.ts'
import { titleScene } from './scenes/title.ts'
import { selectScene } from './scenes/select.ts'
import { arenaScene } from './scenes/arena.ts'
import { versusScene } from './scenes/versus.ts'
import { fightScene } from './scenes/fight.ts'
import { resultScene } from './scenes/result.ts'
import { ac } from './audio/sfx.ts'
import { ensureBgm } from './audio/bgm.ts'
import { bank, loadSprites } from './render/sprite.ts'
import { drawMusicStatus } from './render/hud.ts'

const canvas = document.querySelector<HTMLCanvasElement>('#game')
if (!canvas) throw new Error('missing #game')

const view = createView(canvas)
const devices = createDevices()
mountTouch(devices)
void loadSprites()
void document.fonts.load(`10px ${FONT}`)

const game: Game = {
  view,
  devices,
  p1: emptyInput(),
  p2: emptyInput(),
  session: { ...DEFAULT_SESSION },
  world: null,
  cam: createCam(),
  cpu: createCpu(),
  tick: 0,
  switchTo,
}

const scenes: Record<SceneId, Scene> = {
  title: titleScene(game),
  select: selectScene(game),
  arena: arenaScene(game),
  versus: versusScene(game),
  fight: fightScene(game),
  result: resultScene(game),
}

let scene: Scene = scenes.title
scene.enter()

function switchTo(id: SceneId, data?: unknown): void {
  scene.exit()
  scene = scenes[id]
  scene.enter(data)
}

const bootAudio = () => {
  ac()
  ensureBgm('title')
}
window.addEventListener('pointerdown', bootAudio, { once: true })
window.addEventListener('keydown', bootAudio, { once: true })

const pauseLatch = { p1: emptyInput(), p2: emptyInput() }

startLoop(
  () => {
    refreshPads(devices)
    const p1 = stickToVirtual(readP1(devices), game.p1)
    const p2 = stickToVirtual(readP2(devices), game.p2)
    if (devices.debugPause) {
      latchPresses(pauseLatch.p1, p1)
      latchPresses(pauseLatch.p2, p2)
      game.p1 = p1
      game.p2 = p2
      if (!devices.pauseAdvance) return
      devices.pauseAdvance = false
      game.p1 = withLatchedPresses(p1, pauseLatch.p1)
      game.p2 = withLatchedPresses(p2, pauseLatch.p2)
      pauseLatch.p1 = emptyInput()
      pauseLatch.p2 = emptyInput()
    } else {
      game.p1 = p1
      game.p2 = p2
      pauseLatch.p1 = emptyInput()
      pauseLatch.p2 = emptyInput()
    }
    game.tick += 1
    scene.update()
  },
  () => {
    const ctx = view.btx
    ctx.clearRect(0, 0, view.buffer.width, view.buffer.height)
    scene.draw(ctx)
    drawMusicStatus(ctx)
    if (!bank.ready) {
      ctx.fillStyle = 'rgba(8,4,12,0.55)'
      ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H)
      ctx.textAlign = 'center'
      ctx.font = `10px ${FONT}`
      ctx.fillStyle = '#ffe14a'
      ctx.fillText('LOADING', LOGICAL_W / 2, LOGICAL_H / 2)
    }
    present(view, true)
  },
)
