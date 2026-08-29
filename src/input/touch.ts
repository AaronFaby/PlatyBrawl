import type { DeviceState, RawStick } from './devices.ts'

const FACE = ['lp', 'hp', 'lk', 'hk', 'start'] as const
type FaceKey = (typeof FACE)[number]

function isCoarsePointer(): boolean {
  if (typeof window === 'undefined') return false
  if (navigator.maxTouchPoints > 0) return true
  return window.matchMedia('(pointer: coarse)').matches
}

function bindPad(pad: HTMLElement, stick: RawStick): void {
  const apply = (e: PointerEvent) => {
    const r = pad.getBoundingClientRect()
    if (r.width <= 0 || r.height <= 0) return
    const dx = (e.clientX - r.left) / r.width - 0.5
    const dy = (e.clientY - r.top) / r.height - 0.5
    const dead = 0.12
    stick.left = dx < -dead
    stick.right = dx > dead
    stick.up = dy < -dead
    stick.down = dy > dead
  }
  const clear = () => {
    stick.left = false
    stick.right = false
    stick.up = false
    stick.down = false
  }
  pad.addEventListener('pointerdown', (e) => {
    e.preventDefault()
    pad.setPointerCapture(e.pointerId)
    apply(e)
  })
  pad.addEventListener('pointermove', (e) => {
    if (!pad.hasPointerCapture(e.pointerId)) return
    e.preventDefault()
    apply(e)
  })
  pad.addEventListener('pointerup', (e) => {
    e.preventDefault()
    if (pad.hasPointerCapture(e.pointerId)) pad.releasePointerCapture(e.pointerId)
    clear()
  })
  pad.addEventListener('pointercancel', (e) => {
    e.preventDefault()
    clear()
  })
}

function bindHold(el: HTMLElement, stick: RawStick, key: FaceKey): void {
  const on = (e: PointerEvent) => {
    e.preventDefault()
    el.setPointerCapture(e.pointerId)
    stick[key] = true
  }
  const off = (e: Event) => {
    e.preventDefault()
    stick[key] = false
  }
  el.addEventListener('pointerdown', on)
  el.addEventListener('pointerup', off)
  el.addEventListener('pointercancel', off)
  el.addEventListener('lostpointercapture', off)
}

/** On-screen 8-way pad + six buttons. Writes into `devices.touch` for P1. */
export function mountTouch(devices: DeviceState): void {
  if (!isCoarsePointer()) return
  const root = document.querySelector<HTMLElement>('#touch')
  if (!root) return
  root.hidden = false
  document.body.classList.add('touch')
  const pad = root.querySelector<HTMLElement>('.touch-pad')
  if (pad) bindPad(pad, devices.touch)
  for (const key of FACE) {
    const el = root.querySelector<HTMLElement>(`[data-touch="${key}"]`)
    if (el) bindHold(el, devices.touch, key)
  }
}

export function applyTouch(stick: RawStick, touch: RawStick): void {
  stick.left ||= touch.left
  stick.right ||= touch.right
  stick.up ||= touch.up
  stick.down ||= touch.down
  stick.lp ||= touch.lp
  stick.hp ||= touch.hp
  stick.lk ||= touch.lk
  stick.hk ||= touch.hk
  stick.start ||= touch.start
}
