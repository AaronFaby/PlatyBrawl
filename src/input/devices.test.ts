import { afterEach, describe, expect, it, vi } from 'vitest'
import { createBuffer, matchMotion, pushDir } from './buffer.ts'
import { emptyInput, stickToVirtual } from './virtual.ts'
import { emptyStick, p2WantsJoin, readP1, readP2, refreshPads, type DeviceState } from './devices.ts'

afterEach(() => vi.unstubAllGlobals())

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

function padAt(index: number, button: number, id = 'pad'): Gamepad {
  const pad = fakePad([0, 0])
  const buttons = [...pad.buttons]
  buttons[button] = { pressed: true, touched: true, value: 1 }
  return { ...pad, index, id, buttons }
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
    touch: emptyStick(),
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

  it('Q cycles P1 color and Slash cycles P2 color', () => {
    const d = mockDevices(['KeyQ', 'Slash'])
    expect(readP1(d).color).toBe(true)
    expect(readP2(d).color).toBe(true)
    expect(readP1(mockDevices(['Slash'])).color).toBe(false)
    expect(readP2(mockDevices(['KeyQ'])).color).toBe(false)
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

  it('keeps keyboard movement available while an unarmed pad drifts', () => {
    const d = mockDevices(['KeyD', 'ArrowRight'], [fakePad([0.99, 0], true), null])
    const p1 = readP1(d)
    const p2 = readP2(d)
    expect(p1.right).toBe(true)
    expect(p2.right).toBe(true)
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

describe('mixed keyboard and controller input', () => {
  it.each([0, 1] as const)('preserves both keyboards while pad %i attacks', (slot) => {
    const pads: DeviceState['pads'] = [fakePad([0, 0], false, slot === 0), fakePad([0, 0], false, slot === 1)]
    pads[1] = { ...pads[1]!, index: 1 }
    const d = mockDevices(['KeyA', 'ArrowRight'], pads)
    vi.stubGlobal('navigator', { getGamepads: () => pads })
    refreshPads(d)
    expect(d.down).toEqual(new Set(['KeyA', 'ArrowRight']))
    expect(readP1(d).left).toBe(true)
    expect(readP2(d).right).toBe(true)
    expect((slot === 0 ? readP1(d) : readP2(d)).lp).toBe(true)
  })
})

describe('controller slots', () => {
  it('keeps P2 in P2 when P1 disconnects and resets arming on replacement', () => {
    let connected: (Gamepad | null)[] = [padAt(0, 0), padAt(1, 1)]
    vi.stubGlobal('navigator', { getGamepads: () => connected })
    const d = mockDevices([])
    refreshPads(d)
    expect(readP1(d).lp).toBe(true)
    expect(readP2(d).hp).toBe(true)

    connected = [null, padAt(1, 1)]
    refreshPads(d)
    expect(readP1(d).hp).toBe(false)
    expect(readP2(d).hp).toBe(true)

    connected = [padAt(0, 9), padAt(1, 1)]
    refreshPads(d)
    expect(readP1(d).start).toBe(true)
    expect(readP2(d).hp).toBe(true)

    connected = [null, padAt(1, 1)]
    refreshPads(d)
    connected = [padAt(0, 15), padAt(1, 1)]
    refreshPads(d)
    expect(readP1(d).right).toBe(false)
    expect(d.padArmed[0]).toBe(false)
  })

  it('assigns a pad with a nonzero index to P1 and Start arms it without joining P2', () => {
    vi.stubGlobal('navigator', { getGamepads: () => [null, null, padAt(2, 9)] })
    const d = mockDevices([])
    refreshPads(d)
    expect(readP1(d).start).toBe(true)
    expect(p2WantsJoin(d)).toBe(false)
  })

  it('lets P2 use Start without treating it as a join', () => {
    vi.stubGlobal('navigator', { getGamepads: () => [padAt(0, 0), padAt(1, 9)] })
    const d = mockDevices([])
    refreshPads(d)
    expect(readP2(d).start).toBe(true)
    expect(p2WantsJoin(d)).toBe(false)
  })
})

describe('analog directions', () => {
  it.each([
    [-0.8, -0.9, 7], [0.9, -0.8, 9], [-0.9, 0.8, 1], [0.8, 0.9, 3],
  ])('preserves diagonal axes %i, %i as direction %i', (x, y, dir) => {
    const d = mockDevices([], [fakePad([x, y]), null])
    d.padArmed[0] = true
    expect(stickToVirtual(readP1(d), emptyInput()).dir).toBe(dir)
  })

  it.each([1, -1] as const)('recognizes analog QCF and QCB facing %i', (facing) => {
    for (const motion of ['qcf', 'qcb'] as const) {
      const side = facing * (motion === 'qcf' ? 1 : -1)
      const buf = createBuffer()
      const d = mockDevices([])
      d.padArmed[0] = true
      const axes = [[0, 1], [side * 0.7, 0.7], [side, 0]]
      axes.forEach((xy, frame) => {
        d.pads[0] = fakePad(xy)
        pushDir(buf, stickToVirtual(readP1(d), emptyInput()).dir, frame, facing)
      })
      expect(matchMotion(buf, motion, 2, facing)).toBe(true)
    }
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
