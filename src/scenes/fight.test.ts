import { expect, it, vi } from 'vitest'
import { emptyStick } from '../input/devices.ts'
import { emptyInput } from '../input/virtual.ts'
import { fightScene } from './fight.ts'
import type { Game } from './context.ts'

vi.mock('../audio/announce.ts', () => ({
  speakCallout: vi.fn(), beginAnnounceFrame: vi.fn(), cancelAnnounce: vi.fn(),
}))
vi.mock('../audio/bgm.ts', () => ({ ensureBgm: vi.fn() }))
vi.mock('../audio/sfx.ts', () => ({
  sfxBlock: vi.fn(), sfxGun: vi.fn(), sfxHit: vi.fn(), sfxJump: vi.fn(),
  sfxSpecial: vi.fn(), sfxWhoosh: vi.fn(),
}))
vi.mock('../render/sprite.ts', () => ({ loadStage: vi.fn() }))

it.each([['normal', 96], ['hard', 36]] as const)(
  '%s CPU starts its %i-frame cooldown on play and resets each round', (difficulty, startCool) => {
    const game = {
      session: { p1: 'bob', p2: 'ninja', p2Cpu: true, cpuDifficulty: difficulty },
      devices: { down: new Set(), pads: [null, null], padArmed: [false, false], touch: emptyStick() },
      p1: emptyInput(), p2: emptyInput(),
      switchTo: vi.fn(),
    } as unknown as Game
    const scene = fightScene(game)
    scene.enter()
    game.p2 = { ...emptyInput(), lp: true, lpPress: true, dir: 4 }
    for (let i = 0; i < 110; i++) scene.update()
    expect(game.world!.match.phase).toBe('fight')
    expect(game.cpu.cool).toBe(startCool)
    expect(game.world!.fighters[1].status).toBe('idle')
    expect(game.world!.fighters[1].buffer.lastDir).toBe(5)

    scene.update()
    expect(game.cpu.cool).toBe(startCool - 1)
    game.cpu.plan.push({ ticks: 3, dir: 4 })
    game.cpu.react = 2
    game.world!.match.phase = 'ko'
    game.world!.match.phaseTicks = 160
    game.world!.match.winner = null
    scene.update()
    expect(game.world!.match.round).toBe(2)
    expect(game.cpu.cool).toBe(startCool)
    expect(game.cpu.plan).toEqual([])
    expect(game.cpu.react).toBe(0)
    for (let i = 0; i < 110; i++) scene.update()
    expect(game.cpu.cool).toBe(startCool)
  },
)
