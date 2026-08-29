import { describe, expect, it } from 'vitest'
import { emptyInput, latchPresses, stickToVirtual, withLatchedPresses } from './virtual.ts'
import { emptyStick } from './devices.ts'

describe('press latch', () => {
  it('holds a tap that was released before the next sampled frame', () => {
    const latch = emptyInput()
    const down = stickToVirtual({ ...emptyStick(), lp: true }, emptyInput())
    latchPresses(latch, down)
    const up = stickToVirtual(emptyStick(), down)
    latchPresses(latch, up)
    const advanced = withLatchedPresses(up, latch)
    expect(advanced.lp).toBe(false)
    expect(advanced.lpPress).toBe(true)
    expect(advanced.punchPress).toBe(true)
  })

  it('does not invent an edge for a button held across samples', () => {
    const held = { ...emptyStick(), lp: true }
    const first = stickToVirtual(held, emptyInput())
    const second = stickToVirtual(held, first)
    expect(first.lpPress).toBe(true)
    expect(second.lpPress).toBe(false)
    const latch = emptyInput()
    latchPresses(latch, second)
    const advanced = withLatchedPresses(second, latch)
    expect(advanced.lpPress).toBe(false)
  })
})
