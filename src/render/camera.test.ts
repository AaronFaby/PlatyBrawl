import { describe, expect, it } from 'vitest'
import { createCam, updateCam } from './camera.ts'
import type { Fighter } from '../fight/types.ts'
import { LOGICAL_W, STAGE_PAD } from '../config.ts'
import { createMatch, tickMatch } from '../fight/match.ts'
import { emptyInput } from '../input/virtual.ts'

function fakeFighter(x: number): Fighter {
  return { x, y: 230 } as Fighter
}

describe('camera', () => {
  it.each([[4, 5], [5, 6], [4, 6], [7, 9]])('keeps both fighters visible while retreating with %i/%i', (dir1, dir2) => {
    const world = createMatch({ p1: 'bob', p2: 'bob', p2Cpu: false })
    const cam = createCam()
    for (let i = 0; i < 110; i++) tickMatch(world, [emptyInput(), emptyInput()], false)
    for (let i = 0; i < 300; i++) {
      tickMatch(world, [{ ...emptyInput(), dir: dir1 }, { ...emptyInput(), dir: dir2 }], false)
      updateCam(cam, ...world.fighters)
      for (const f of world.fighters) {
        expect(f.x - cam.x).toBeGreaterThanOrEqual(STAGE_PAD - 0.001)
        expect(f.x - cam.x).toBeLessThanOrEqual(LOGICAL_W - STAGE_PAD + 0.001)
      }
    }
    if (dir1 === 5) expect(world.fighters[0].x).toBe(220)
    if (dir2 === 5) expect(world.fighters[1].x).toBe(500)
  })

  it('does not slide when P2 takes a few steps inside the frame', () => {
    const cam = createCam()
    const start = cam.x
    const p1 = fakeFighter(220)
    const p2 = fakeFighter(500)
    for (let i = 0; i < 20; i++) {
      p2.x -= 1.5
      updateCam(cam, p1, p2)
    }
    expect(Math.abs(cam.x - start)).toBeLessThan(2)
  })
})
