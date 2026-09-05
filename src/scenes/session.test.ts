import { expect, it, vi } from 'vitest'
import { emptyInput } from '../input/virtual.ts'
import { emptyStick } from '../input/devices.ts'
import { createMatch } from '../fight/match.ts'
import { titleScene } from './title.ts'
import { selectScene } from './select.ts'
import { resultScene } from './result.ts'
import type { Game } from './context.ts'

vi.mock('../audio/sfx.ts', () => ({
  ac: vi.fn(), audioReady: () => true, sfxStart: vi.fn(), sfxSelect: vi.fn(), sfxLock: vi.fn(), sfxWin: vi.fn(),
}))
vi.mock('../audio/bgm.ts', () => ({ ensureBgm: vi.fn() }))

function gameForSelection(): Game {
  return {
    session: { p1: 'bob', p2: 'ninja', p2Cpu: false, cpuDifficulty: 'hard', stageId: 'dojo', bgmId: 'toxic', p1Skin: 2, p2Skin: 3 },
    p1: emptyInput(), p2: emptyInput(),
    devices: { down: new Set(), pads: [null, null], padArmed: [false, false], touch: emptyStick() },
    switchTo: vi.fn(),
  } as unknown as Game
}

it('returns from Title to CPU selection and lets P1 start without P2', () => {
  const game = gameForSelection()
  const before = { ...game.session }
  const title = titleScene(game)
  title.enter()
  expect(game.session).toEqual({ ...before, p2Cpu: true })
  game.p1.startPress = true
  title.update()
  expect(game.switchTo).toHaveBeenCalledWith('select')
  title.exit()
  const select = selectScene(game)
  select.enter()
  select.update()
  expect(game.switchTo).toHaveBeenCalledWith('arena')
  expect(game.session.p2Cpu).toBe(true)
  expect(game.session.p2).not.toBe(game.session.p1)
})

it('keeps the human session and settings for rematch', () => {
  const game = gameForSelection()
  const before = { ...game.session }
  const result = resultScene(game)
  result.enter({ winner: 0, world: createMatch(game.session) })
  game.p1.startPress = true
  result.update()
  expect(game.switchTo).toHaveBeenCalledWith('versus')
  expect(game.session).toEqual(before)
})
