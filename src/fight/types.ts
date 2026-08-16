import type { CharId } from '../config.ts'
import type { StageId } from '../data/stages.ts'

export type PlayerId = 0 | 1
export type Facing = 1 | -1

export type Box = { x: number; y: number; w: number; h: number }

export type ProjectileKind = 'shuriken' | 'beam' | 'bullet' | 'chain'

export type AnimFlags = {
  invuln?: boolean
  invulnHead?: boolean
  armorHits?: number
  projectile?: ProjectileKind
  teleport?: 'front' | 'behind'
}

export type AnimFrame = {
  cell: number
  duration: number
  hurt: Box[]
  hit?: Box[]
  push: Box
  dvx?: number
  dvy?: number
  flags?: AnimFlags
}

export type MoveHeight = 'high' | 'low' | 'mid' | 'air'

export type MoveDef = {
  id: string
  anim: string
  damage: number
  onHitStun: number
  onBlockStun: number
  hitstop: number
  knockdown?: boolean
  launch?: number
  height: MoveHeight
  cancelInto?: string[]
  pushHit?: number
  pushBlock?: number
}

export type MotionKind = 'qcf' | 'qcb' | 'dp' | 'charge'

export type SpecialDef = {
  motion: MotionKind
  button: 'p' | 'k'
  light: string
  heavy: string
}

export type CharDef = {
  id: CharId
  name: string
  subtitle: string
  walkSpeed: number
  backSpeed: number
  jumpV: number
  anims: Record<string, AnimFrame[]>
  moves: Record<string, MoveDef>
  specials: SpecialDef[]
}

export type FighterStatus =
  | 'idle'
  | 'walk'
  | 'walkBack'
  | 'crouch'
  | 'jump'
  | 'attack'
  | 'special'
  | 'block'
  | 'hurt'
  | 'knockdown'
  | 'wakeup'
  | 'land'
  | 'throw'
  | 'thrown'
  | 'win'
  | 'ko'

export type DirEvent = { dir: number; frame: number }

export type InputBuffer = {
  events: DirEvent[]
  lastDir: number
  chargeBack: number
  chargeGrace: number
}

export type Fighter = {
  id: PlayerId
  charId: CharId
  def: CharDef
  x: number
  y: number
  vx: number
  vy: number
  facing: Facing
  hp: number
  status: FighterStatus
  anim: string
  frameIndex: number
  frameTicks: number
  moveId: string | null
  hasHit: boolean
  canCancel: boolean
  hitstop: number
  stun: number
  pendingKd: boolean
  armorLeft: number
  wakeupInvuln: number
  landTicks: number
  flash: number
  buffer: InputBuffer
  prevStatus: FighterStatus
  reel: number
  reelDir: Facing
}

export type Projectile = {
  owner: PlayerId
  kind: ProjectileKind
  x: number
  y: number
  vx: number
  w: number
  h: number
  damage: number
  onHitStun: number
  onBlockStun: number
  hitstop: number
  height: MoveHeight
  life: number
  hasHit: boolean
  facing: Facing
  pull?: number
  tether?: PlayerId
}

export type Spark = { x: number; y: number; life: number; max: number }

export type MatchPhase = 'intro' | 'fight' | 'ko' | 'timeout' | 'over'

export type MatchState = {
  phase: MatchPhase
  phaseTicks: number
  round: number
  timer: number
  timerAcc: number
  wins: [number, number]
  hitstop: number
  shake: number
  sparks: Spark[]
  projectiles: Projectile[]
  announce: string
  winner: PlayerId | null
  timeout: boolean
  stageId: StageId
}

export type CpuDifficulty = 'normal' | 'hard'

export type Session = {
  p1: CharId
  p2: CharId
  p2Cpu: boolean
  cpuDifficulty?: CpuDifficulty
}
