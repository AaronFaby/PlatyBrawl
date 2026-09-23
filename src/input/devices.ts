import { audioReady, toggleMute, toggleSfxMute } from '../audio/sfx.ts'
import { applyTouch } from './touch.ts'

const GAME_CODES = new Set([
  'KeyA',
  'KeyD',
  'KeyW',
  'KeyS',
  'KeyU',
  'KeyI',
  'KeyJ',
  'KeyK',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Numpad4',
  'Numpad5',
  'Numpad1',
  'Numpad2',
  'KeyO',
  'KeyP',
  'KeyL',
  'Semicolon',
  'Enter',
  'Space',
  'F1',
  'F2',
  'F3',
  'KeyM',
  'KeyN',
  'KeyH',
  'KeyQ',
  'Slash',
  'Escape',
])

export type RawStick = {
  left: boolean
  right: boolean
  up: boolean
  down: boolean
  lp: boolean
  hp: boolean
  lk: boolean
  hk: boolean
  start: boolean
  color: boolean
}

export function emptyStick(): RawStick {
  return {
    left: false,
    right: false,
    up: false,
    down: false,
    lp: false,
    hp: false,
    lk: false,
    hk: false,
    start: false,
    color: false,
  }
}

export type DeviceState = {
  down: Set<string>
  pads: (Gamepad | null)[]
  padArmed: [boolean, boolean]
  debugHitboxes: boolean
  debugDummyBlock: boolean
  debugPause: boolean
  pauseAdvance: boolean
  touch: RawStick
}

export function createDevices(): DeviceState {
  const down = new Set<string>()
  const pads: (Gamepad | null)[] = [null, null]

  window.addEventListener('keydown', (e) => {
    if (GAME_CODES.has(e.code)) e.preventDefault()
    down.add(e.code)
    if (e.code === 'KeyM') {
      if (!e.repeat && audioReady()) toggleMute()
      return
    }
    if (e.code === 'KeyN') {
      if (!e.repeat && audioReady()) toggleSfxMute()
      return
    }
    if (e.code === 'F1') devices.debugHitboxes = !devices.debugHitboxes
    if (e.code === 'F2') devices.debugDummyBlock = !devices.debugDummyBlock
    if (e.code === 'F3') {
      if (devices.debugPause) devices.pauseAdvance = true
      else devices.debugPause = true
    }
    if (e.code === 'Escape' && devices.debugPause) devices.debugPause = false
  })
  window.addEventListener('keyup', (e) => {
    down.delete(e.code)
  })
  window.addEventListener('blur', () => down.clear())
  window.addEventListener('gamepadconnected', () => refreshPads(devices))
  window.addEventListener('gamepaddisconnected', () => refreshPads(devices))

  const devices: DeviceState = {
    down,
    pads,
    padArmed: [false, false],
    debugHitboxes: false,
    debugDummyBlock: false,
    debugPause: false,
    pauseAdvance: false,
    touch: emptyStick(),
  }
  return devices
}

export function clearKeys(devices: DeviceState): void {
  devices.down.clear()
}

function facePressed(pad: Gamepad | null): boolean {
  if (!pad) return false
  return !!(pad.buttons[0]?.pressed || pad.buttons[1]?.pressed || pad.buttons[2]?.pressed || pad.buttons[3]?.pressed)
}

/** Slot 0 is always P1. Slot 1 is a second distinct pad only — never the same stick twice. */
function pollPads(devices: DeviceState): void {
  const pads = devices.pads
  const list = navigator.getGamepads ? [...navigator.getGamepads()].filter((g): g is Gamepad => !!g) : []
  for (let i = 0; i < 2; i++) {
    const old = pads[i]
    if (!old) continue
    const current = list.find((g) => g.index === old.index)
    if (!current || current.id !== old.id) devices.padArmed[i] = false
    pads[i] = current ?? null
  }
  for (const g of list) {
    if (pads.some((p) => p?.index === g.index)) continue
    const slot = pads.indexOf(null)
    if (slot < 0) break
    pads[slot] = g
  }
}

export function refreshPads(devices: DeviceState): void {
  pollPads(devices)
  for (let i = 0; i < 2; i++) {
    const p = devices.pads[i]
    if (!p) devices.padArmed[i] = false
    else if (facePressed(p) || !!p.buttons[9]?.pressed) devices.padArmed[i] = true
  }
}

function padMove(pad: Gamepad | null): { left: boolean; right: boolean; up: boolean; down: boolean } {
  const out = { left: false, right: false, up: false, down: false }
  if (!pad) return out
  const ax = pad.axes[0] ?? 0
  const ay = pad.axes[1] ?? 0
  const dead = 0.5
  let h = 0
  let v = 0
  if (ax <= -dead) h = -1
  else if (ax >= dead) h = 1
  if (ay <= -dead) v = 1
  else if (ay >= dead) v = -1
  if (pad.buttons[14]?.pressed) h = -1
  if (pad.buttons[15]?.pressed) h = 1
  if (pad.buttons[12]?.pressed) v = 1
  if (pad.buttons[13]?.pressed) v = -1
  if (h < 0) out.left = true
  if (h > 0) out.right = true
  if (v > 0) out.up = true
  if (v < 0) out.down = true
  return out
}

export function readP1(devices: DeviceState): RawStick {
  const d = devices.down
  const s = emptyStick()
  if (d.has('KeyA')) s.left = true
  if (d.has('KeyD')) s.right = true
  if (d.has('KeyW')) s.up = true
  if (d.has('KeyS')) s.down = true
  if (d.has('KeyU')) s.lp = true
  if (d.has('KeyI')) s.hp = true
  if (d.has('KeyJ')) s.lk = true
  if (d.has('KeyK')) s.hk = true
  if (d.has('KeyQ')) s.color = true
  if (d.has('Enter') || d.has('Space')) s.start = true
  applyPad(s, devices.padArmed[0] ? devices.pads[0] : null)
  applyTouch(s, devices.touch)
  return s
}

export function readP2(devices: DeviceState): RawStick {
  const d = devices.down
  const s = emptyStick()
  if (d.has('ArrowLeft')) s.left = true
  if (d.has('ArrowRight')) s.right = true
  if (d.has('ArrowUp')) s.up = true
  if (d.has('ArrowDown')) s.down = true
  if (d.has('Numpad4') || d.has('KeyO')) s.lp = true
  if (d.has('Numpad5') || d.has('KeyP')) s.hp = true
  if (d.has('Numpad1') || d.has('KeyL')) s.lk = true
  if (d.has('Numpad2') || d.has('Semicolon')) s.hk = true
  if (d.has('Slash')) s.color = true
  if (d.has('Enter')) s.start = true
  applyPad(s, devices.padArmed[1] ? devices.pads[1] : null)
  return s
}

function applyPad(stick: RawStick, pad: Gamepad | null): void {
  if (!pad) return
  const move = padMove(pad)
  stick.left ||= move.left
  stick.right ||= move.right
  stick.up ||= move.up
  stick.down ||= move.down
  stick.lp ||= !!pad.buttons[0]?.pressed
  stick.hp ||= !!pad.buttons[1]?.pressed
  stick.lk ||= !!pad.buttons[2]?.pressed
  stick.hk ||= !!pad.buttons[3]?.pressed
  stick.start ||= !!pad.buttons[9]?.pressed
  stick.color ||= !!pad.buttons[4]?.pressed
}

const P2_JOIN_KEYS = ['Numpad4', 'Numpad5', 'Numpad1', 'Numpad2', 'KeyO', 'KeyP', 'KeyL', 'Semicolon'] as const

/** A second human sat down. Arrows only move the CPU cursor — they do not join. */
export function p2WantsJoin(devices: DeviceState): boolean {
  for (const code of P2_JOIN_KEYS) {
    if (devices.down.has(code)) return true
  }
  return devices.padArmed[1] && facePressed(devices.pads[1])
}
