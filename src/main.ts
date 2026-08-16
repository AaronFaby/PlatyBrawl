import './style.css'
import { emptyInput, stickToVirtual } from './input/virtual.ts'
import { createDevices, readP1, readP2, refreshPads } from './input/devices.ts'
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
import { loadSprites } from './render/sprite.ts'
import { drawMusicStatus } from './render/hud.ts'

await loadSprites()

const canvas = document.querySelector<HTMLCanvasElement>('#game')
if (!canvas) throw new Error('missing #game')

const view = createView(canvas)
const devices = createDevices()

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

startLoop(
  () => {
    refreshPads(devices)
    if (devices.debugPause) {
      if (!devices.pauseAdvance) return
      devices.pauseAdvance = false
    }
    game.p1 = stickToVirtual(readP1(devices), game.p1)
    game.p2 = stickToVirtual(readP2(devices), game.p2)
    game.tick += 1
    scene.update()
  },
  () => {
    const ctx = view.btx
    ctx.clearRect(0, 0, view.buffer.width, view.buffer.height)
    scene.draw(ctx)
    drawMusicStatus(ctx)
    present(view, true)
  },
)
