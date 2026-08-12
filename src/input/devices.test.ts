import { describe, expect, it } from 'vitest'
import { emptyStick, p2WantsJoin, readP1, readP2, type DeviceState } from './devices.ts'

function fakePad(axes: number[], dpadRight = false, face = false): Gamepad {
  const buttons = Array.from({ length: 16 }, () => ({ pressed: false, touched: false, value: 0 }))
  if (dpadRight) buttons[15] = { pressed: true, touched: true, value: 1 }
  if (face) buttons[0] = { pressed: true, touched: true, value: 1 }
  return {
    id: 'pad',
    index: 0,
    mapping: 'standard',
    axes,
    buttons,
    connected: true,
    timestamp: 0,
  } as unknown as Gamepad
}

function mockDevices(keys: string[], pads: DeviceState['pads'] = [null, null]): DeviceState {
  return {
    down: new Set(keys),
    pads,
    padArmed: [false, false],
    debugHitboxes: false,
    debugDummyBlock: false,
    debugPause: false,
    pauseAdvance: false,
  }
}

describe('keyboard isolation', () => {
  it('WASD and P1 attacks do not move P2', () => {
    const d = mockDevices(['KeyA', 'KeyD', 'KeyW', 'KeyS', 'KeyU', 'KeyI', 'KeyJ', 'KeyK', 'Space'])
    const p1 = readP1(d)
    const p2 = readP2(d)
    expect(p1.left && p1.right && p1.up && p1.down).toBe(true)
    expect(p1.lp && p1.hp && p1.lk && p1.hk).toBe(true)
    expect(p2.left || p2.right || p2.up || p2.down).toBe(false)
    expect(p2.lp || p2.hp || p2.lk || p2.hk).toBe(false)
    expect(p2WantsJoin(d)).toBe(false)
  })

  it('P2 arrows do not move P1', () => {
    const d = mockDevices(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyO'])
    const p1 = readP1(d)
    const p2 = readP2(d)
    expect(p1.left || p1.right || p1.up || p1.down || p1.lp).toBe(false)
    expect(p2.left && p2.right && p2.up && p2.down && p2.lp).toBe(true)
    expect(p2WantsJoin(d)).toBe(true)
  })

  it('arrows do not count as a human P2 join', () => {
    const d = mockDevices(['ArrowLeft', 'ArrowRight'])
    expect(p2WantsJoin(d)).toBe(false)
    expect(readP2(d).left).toBe(true)
  })
})

describe('unarmed pads', () => {
  it('ignores stick drift until a face button arms the pad', () => {
    const d = mockDevices([], [fakePad([0.99, -0.99]), null])
    const p1 = readP1(d)
    expect(p1.left || p1.right || p1.up || p1.down).toBe(false)
  })

  it('does not let a pad type fake WASD or arrows', () => {
    const d = mockDevices(['KeyD', 'ArrowRight'], [fakePad([0.99, 0], true), null])
    const p1 = readP1(d)
    const p2 = readP2(d)
    expect(p1.left || p1.right || p1.up || p1.down).toBe(false)
    expect(p2.left || p2.right || p2.up || p2.down).toBe(false)
  })

  it('WASD still moves P1 when no pad is talking', () => {
    const d = mockDevices(['KeyD'])
    expect(readP1(d).right).toBe(true)
    expect(readP2(d).right).toBe(false)
  })

  it('reads movement and attacks after a pad is armed', () => {
    const d = mockDevices([], [fakePad([0.99, 0], true, true), null])
    d.padArmed[0] = true
    const p1 = readP1(d)
    expect(p1.right).toBe(true)
    expect(p1.lp).toBe(true)
  })

  it('keeps keyboard movement available while an armed pad is idle', () => {
    const d = mockDevices(['KeyD'], [fakePad([0, 0]), null])
    d.padArmed[0] = true
    expect(readP1(d).right).toBe(true)
  })
})

describe('empty stick', () => {
  it('does not share objects', () => {
    const a = emptyStick()
    const b = emptyStick()
    a.left = true
    expect(b.left).toBe(false)
  })
})
