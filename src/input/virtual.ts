import { dirFromAxes } from '../fight/boxes.ts'
import type { RawStick } from './devices.ts'

export type VirtualInput = {
  dir: number
  lp: boolean
  hp: boolean
  lk: boolean
  hk: boolean
  start: boolean
  color: boolean
  lpPress: boolean
  hpPress: boolean
  lkPress: boolean
  hkPress: boolean
  startPress: boolean
  colorPress: boolean
  punchPress: boolean
  kickPress: boolean
}

export function emptyInput(): VirtualInput {
  return {
    dir: 5,
    lp: false,
    hp: false,
    lk: false,
    hk: false,
    start: false,
    color: false,
    lpPress: false,
    hpPress: false,
    lkPress: false,
    hkPress: false,
    startPress: false,
    colorPress: false,
    punchPress: false,
    kickPress: false,
  }
}

export function latchPresses(into: VirtualInput, sample: VirtualInput): void {
  into.lpPress ||= sample.lpPress
  into.hpPress ||= sample.hpPress
  into.lkPress ||= sample.lkPress
  into.hkPress ||= sample.hkPress
  into.startPress ||= sample.startPress
  into.colorPress ||= sample.colorPress
  into.punchPress = into.lpPress || into.hpPress
  into.kickPress = into.lkPress || into.hkPress
}

export function withLatchedPresses(sample: VirtualInput, latch: VirtualInput): VirtualInput {
  const lpPress = sample.lpPress || latch.lpPress
  const hpPress = sample.hpPress || latch.hpPress
  const lkPress = sample.lkPress || latch.lkPress
  const hkPress = sample.hkPress || latch.hkPress
  const startPress = sample.startPress || latch.startPress
  const colorPress = sample.colorPress || latch.colorPress
  return {
    ...sample,
    lpPress,
    hpPress,
    lkPress,
    hkPress,
    startPress,
    colorPress,
    punchPress: lpPress || hpPress,
    kickPress: lkPress || hkPress,
  }
}

export function stickToVirtual(stick: RawStick, prev: VirtualInput): VirtualInput {
  const h = (stick.right ? 1 : 0) - (stick.left ? 1 : 0)
  const v = (stick.up ? 1 : 0) - (stick.down ? 1 : 0)
  const dir = dirFromAxes(h, v)
  const lpPress = stick.lp && !prev.lp
  const hpPress = stick.hp && !prev.hp
  const lkPress = stick.lk && !prev.lk
  const hkPress = stick.hk && !prev.hk
  const startPress = stick.start && !prev.start
  const colorPress = stick.color && !prev.color
  return {
    dir,
    lp: stick.lp,
    hp: stick.hp,
    lk: stick.lk,
    hk: stick.hk,
    start: stick.start,
    color: stick.color,
    lpPress,
    hpPress,
    lkPress,
    hkPress,
    startPress,
    colorPress,
    punchPress: lpPress || hpPress,
    kickPress: lkPress || hkPress,
  }
}
