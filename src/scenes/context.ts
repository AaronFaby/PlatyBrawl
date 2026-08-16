import type { CpuBrain } from '../ai/cpu.ts'
import type { CharId } from '../config.ts'
import type { FightWorld } from '../fight/match.ts'
import type { Session } from '../fight/types.ts'
import type { DeviceState } from '../input/devices.ts'
import type { VirtualInput } from '../input/virtual.ts'
import type { Cam } from '../render/camera.ts'
import type { View } from '../render/canvas.ts'

export type SceneId = 'title' | 'select' | 'arena' | 'versus' | 'fight' | 'result'

export type Scene = {
  id: SceneId
  enter: (data?: unknown) => void
  exit: () => void
  update: () => void
  draw: (ctx: CanvasRenderingContext2D) => void
}

export type Game = {
  view: View
  devices: DeviceState
  p1: VirtualInput
  p2: VirtualInput
  session: Session
  world: FightWorld | null
  cam: Cam
  cpu: CpuBrain
  tick: number
  switchTo: (id: SceneId, data?: unknown) => void
}

export const DEFAULT_SESSION: Session = { p1: 'bob', p2: 'ninja', p2Cpu: true, cpuDifficulty: 'normal' }

export const ROSTER_ORDER: CharId[] = ['bob', 'ninja', 'cyber', 'soldier', 'chainsaw']
