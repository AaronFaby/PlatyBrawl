import { dirFromAxes } from '../fight/boxes.ts'
import type { RawStick } from './devices.ts'

export type VirtualInput = {
  dir: number
  lp: boolean
  hp: boolean
  lk: boolean
  hk: boolean
  start: boolean
  lpPress: boolean
  hpPress: boolean
  lkPress: boolean
  hkPress: boolean
  startPress: boolean
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
    lpPress: false,
    hpPress: false,
    lkPress: false,
    hkPress: false,
    startPress: false,
    punchPress: false,
    kickPress: false,
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
  return {
    dir,
    lp: stick.lp,
    hp: stick.hp,
    lk: stick.lk,
    hk: stick.hk,
    start: stick.start,
    lpPress,
    hpPress,
    lkPress,
    hkPress,
    startPress,
    punchPress: lpPress || hpPress,
    kickPress: lkPress || hkPress,
  }
}
