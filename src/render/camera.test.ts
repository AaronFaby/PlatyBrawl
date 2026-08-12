import { describe, expect, it } from 'vitest'
import { createCam, updateCam } from './camera.ts'
import type { Fighter } from '../fight/types.ts'

function fakeFighter(x: number): Fighter {
  return { x, y: 230 } as Fighter
}

describe('camera', () => {
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
