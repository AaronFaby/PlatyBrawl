import {
  GRAVITY,
  GROUND_Y,
  LAND_RECOVERY,
  MAX_HP,
  REEL_SPEED,
  STAGE_PAD,
  STAGE_W,
  THROW_RANGE,
  WAKEUP_INVULN,
} from '../config.ts'
import { getChar } from '../data/roster.ts'
import { createBuffer, matchMotion, pushDir } from '../input/buffer.ts'
import type { VirtualInput } from '../input/virtual.ts'
import { emptyInput } from '../input/virtual.ts'
import type { CharId } from '../config.ts'
import { faceRel } from './boxes.ts'
import type {
  AnimFrame,
  Facing,
  Fighter,
  FighterStatus,
  MatchState,
  PlayerId,
  ProjectileKind,
} from './types.ts'

export type FightHooks = {
  frame: number
  other: Fighter
  match: MatchState
  spawnProjectile: (owner: Fighter, kind: ProjectileKind, heavy: boolean) => void
}

export function createFighter(id: PlayerId, charId: CharId, x: number, facing: Facing): Fighter {
  const def = getChar(charId)
  return {
    id,
    charId,
    def,
    x,
    y: GROUND_Y,
    vx: 0,
    vy: 0,
    facing,
    hp: MAX_HP,
    status: 'idle',
    anim: 'idle',
    frameIndex: 0,
    frameTicks: 0,
    moveId: null,
    hasHit: false,
    canCancel: false,
    hitstop: 0,
    stun: 0,
    pendingKd: false,
    armorLeft: 0,
    wakeupInvuln: 0,
    landTicks: 0,
    flash: 0,
    buffer: createBuffer(),
    prevStatus: 'idle',
    reel: 0,
    reelDir: 1,
  }
}

export function resetFighter(f: Fighter, x: number, facing: Facing): void {
  f.x = x
  f.y = GROUND_Y
  f.vx = 0
  f.vy = 0
  f.facing = facing
  f.hp = MAX_HP
  f.status = 'idle'
  f.anim = 'idle'
  f.frameIndex = 0
  f.frameTicks = 0
  f.moveId = null
  f.hasHit = false
  f.canCancel = false
  f.hitstop = 0
  f.stun = 0
  f.pendingKd = false
  f.armorLeft = 0
  f.wakeupInvuln = 0
  f.landTicks = 0
  f.flash = 0
  f.reel = 0
  f.reelDir = 1
  f.buffer.events.length = 0
  f.buffer.lastDir = 5
  f.buffer.chargeBack = 0
  f.buffer.chargeGrace = 0
}

export function currentFrame(f: Fighter): AnimFrame {
  const anim = f.def.anims[f.anim] ?? f.def.anims.idle
  return anim[Math.min(f.frameIndex, anim.length - 1)]
}

export function grounded(f: Fighter): boolean {
  return f.y >= GROUND_Y - 0.01 && f.vy >= 0
}

export function airborne(f: Fighter): boolean {
  return !grounded(f)
}

export function actionable(f: Fighter): boolean {
  return (
    f.status === 'idle' ||
    f.status === 'walk' ||
    f.status === 'walkBack' ||
    f.status === 'crouch'
  )
}

function setAnim(f: Fighter, name: string, status: FighterStatus): void {
  if (f.anim === name && f.status === status && (name === 'idle' || name === 'walk' || name === 'walkBack' || name === 'crouch' || name === 'block' || name === 'crouchBlock')) {
    f.status = status
    return
  }
  f.prevStatus = f.status
  f.status = status
  f.anim = name
  f.frameIndex = 0
  f.frameTicks = 0
  const fr = currentFrame(f)
  if (fr.dvx) f.vx += fr.dvx * f.facing
  if (fr.dvy) f.vy += fr.dvy
  f.armorLeft = fr.flags?.armorHits ?? 0
}

export function startMove(f: Fighter, moveId: string): void {
  const move = f.def.moves[moveId]
  if (!move) return
  f.moveId = moveId
  f.hasHit = false
  f.canCancel = false
  const isSpecial = f.def.specials.some((s) => s.light === moveId || s.heavy === moveId)
  setAnim(f, move.anim, isSpecial ? 'special' : 'attack')
}

function onAnimEnd(f: Fighter): void {
  if (f.status === 'ko' || f.status === 'win') {
    f.frameIndex = f.def.anims[f.anim].length - 1
    f.frameTicks = 0
    return
  }
  if (f.status === 'knockdown') {
    setAnim(f, 'wakeup', 'wakeup')
    f.wakeupInvuln = WAKEUP_INVULN
    return
  }
  if (f.status === 'wakeup' || f.status === 'land' || f.status === 'throw' || f.status === 'thrown') {
    setAnim(f, 'idle', 'idle')
    f.moveId = null
    return
  }
  if (f.status === 'attack' || f.status === 'special') {
    if (airborne(f)) {
      f.anim = 'jump'
      f.status = 'jump'
      f.frameIndex = 0
      f.frameTicks = 0
      f.moveId = null
      return
    }
    setAnim(f, 'idle', 'idle')
    f.moveId = null
    return
  }
  if (f.status === 'hurt' && f.stun <= 0) {
    if (f.pendingKd) {
      f.pendingKd = false
      setAnim(f, 'knockdown', 'knockdown')
      f.vx = 0
      return
    }
    if (airborne(f)) {
      f.anim = 'jump'
      f.status = 'jump'
      return
    }
    setAnim(f, 'idle', 'idle')
    return
  }
  // loop
  f.frameIndex = 0
  f.frameTicks = 0
}

function advanceAnim(f: Fighter): void {
  const anim = f.def.anims[f.anim]
  if (!anim || anim.length === 0) return
  f.frameTicks += 1
  if (f.frameTicks < currentFrame(f).duration) return
  f.frameTicks = 0
  f.frameIndex += 1
  if (f.frameIndex >= anim.length) {
    onAnimEnd(f)
    return
  }
  const fr = currentFrame(f)
  if (fr.dvx) f.vx += fr.dvx * f.facing
  if (fr.dvy) f.vy += fr.dvy
  if (fr.flags?.armorHits && f.armorLeft <= 0) f.armorLeft = fr.flags.armorHits
}

function crouching(dir: number): boolean {
  return dir === 1 || dir === 2 || dir === 3
}

function trySpecial(f: Fighter, input: VirtualInput, hooks: FightHooks): boolean {
  const punch = input.punchPress
  const kick = input.kickPress
  if (!punch && !kick) return false
  const heavyP = input.hpPress
  const heavyK = input.hkPress
  for (const spec of f.def.specials) {
    const btnOk = spec.button === 'p' ? punch : kick
    if (!btnOk) continue
    if (!matchMotion(f.buffer, spec.motion, hooks.frame, f.facing)) continue
    if (spec.motion === 'charge') {
      f.buffer.chargeBack = 0
      f.buffer.chargeGrace = 0
    }
    const id = (spec.button === 'p' ? heavyP : heavyK) ? spec.heavy : spec.light
    startMove(f, id)
    return true
  }
  return false
}

function tryThrow(f: Fighter, input: VirtualInput, other: Fighter): boolean {
  if (!grounded(f) || !grounded(other)) return false
  const both = input.lp && input.lk && (input.lpPress || input.lkPress)
  if (!both) return false
  if (Math.abs(other.x - f.x) > THROW_RANGE) return false
  if (other.status === 'knockdown' || other.status === 'wakeup' || other.status === 'ko' || other.status === 'thrown') {
    return false
  }
  startMove(f, 'throw')
  other.status = 'thrown'
  other.anim = 'thrown'
  other.frameIndex = 0
  other.frameTicks = 0
  other.moveId = null
  other.stun = 20
  other.pendingKd = true
  other.hp = Math.max(0, other.hp - 140)
  other.vx = f.facing * 2.4
  other.vy = -2.2
  other.flash = 6
  if (other.hp <= 0) {
    other.status = 'ko'
    other.anim = 'ko'
    other.frameIndex = 0
    other.frameTicks = 0
  }
  return true
}

function tryNormals(f: Fighter, input: VirtualInput): boolean {
  const air = airborne(f)
  const crouch = !air && crouching(input.dir)
  if (air) {
    if (input.hpPress || input.hkPress) {
      startMove(f, 'jumpHK')
      return true
    }
    if (input.lpPress || input.lkPress) {
      startMove(f, 'jumpLP')
      return true
    }
    return false
  }
  if (crouch) {
    if (input.hkPress || input.hpPress) {
      startMove(f, 'crouchHK')
      return true
    }
    if (input.lpPress || input.lkPress) {
      startMove(f, 'crouchLP')
      return true
    }
    return false
  }
  if (input.hpPress) {
    startMove(f, 'standHP')
    return true
  }
  if (input.hkPress) {
    startMove(f, 'standHK')
    return true
  }
  if (input.lpPress) {
    startMove(f, 'standLP')
    return true
  }
  if (input.lkPress) {
    startMove(f, 'standLK')
    return true
  }
  return false
}

function tryCancel(f: Fighter, input: VirtualInput, hooks: FightHooks): void {
  if (!f.canCancel || !f.moveId) return
  const move = f.def.moves[f.moveId]
  if (!move?.cancelInto?.length) return
  const fr = currentFrame(f)
  if (!fr.hit && f.frameIndex === 0) return
  if (trySpecial(f, input, hooks)) return
}

function locomotion(f: Fighter, input: VirtualInput, locked: boolean): void {
  if (locked || !actionable(f)) return
  const rel = faceRel(input.dir, f.facing)
  if (input.dir === 7 || input.dir === 8 || input.dir === 9) {
    const hop = input.dir === 7 ? -1 : input.dir === 9 ? 1 : 0
    f.vy = f.def.jumpV
    f.vx = hop * f.def.walkSpeed * 1.35
    setAnim(f, 'jump', 'jump')
    return
  }
  if (crouching(input.dir)) {
    f.vx = 0
    setAnim(f, 'crouch', 'crouch')
    return
  }
  if (rel === 6 || rel === 3 || rel === 9) {
    f.vx = f.facing * f.def.walkSpeed
    setAnim(f, 'walk', 'walk')
    return
  }
  if (rel === 4 || rel === 1 || rel === 7) {
    f.vx = -f.facing * f.def.backSpeed
    setAnim(f, 'walkBack', 'walkBack')
    return
  }
  f.vx = 0
  setAnim(f, 'idle', 'idle')
}

function applyLand(f: Fighter): void {
  if (f.y < GROUND_Y) return
  const wasAir = f.prevStatus === 'jump' || f.status === 'jump' || f.status === 'hurt' || (f.status === 'attack' && f.moveId?.startsWith('jump')) || f.status === 'special'
  if (f.vy < 0) return
  f.y = GROUND_Y
  f.vy = 0
  if (f.status === 'ko') {
    f.vx = 0
    return
  }
  if (f.status === 'thrown') return
  if (f.status === 'hurt' && f.pendingKd) {
    f.pendingKd = false
    f.stun = 0
    f.vx = 0
    setAnim(f, 'knockdown', 'knockdown')
    return
  }
  if (f.status === 'hurt' && f.stun > 0) {
    f.vx *= 0.4
    return
  }
  if (f.status === 'special' && (f.moveId?.startsWith('venom') || f.moveId?.startsWith('rocket'))) {
    // specials finish their recovery on the ground
    f.vx = 0
    return
  }
  if (f.status === 'attack' && f.moveId?.startsWith('jump')) {
    f.vx = 0
    f.moveId = null
    setAnim(f, 'land', 'land')
    f.landTicks = LAND_RECOVERY
    return
  }
  if (f.status === 'jump' || (wasAir && actionable(f))) {
    f.vx = 0
    setAnim(f, 'land', 'land')
    f.landTicks = LAND_RECOVERY
  }
}

function handleTeleport(f: Fighter, other: Fighter): void {
  const fr = currentFrame(f)
  if (!fr.flags?.teleport) return
  if (f.frameTicks !== 0) return
  if (fr.flags.teleport === 'front') {
    f.x += f.facing * 52
  } else {
    const side = f.x < other.x ? 1 : -1
    f.x = other.x + side * 42
  }
  f.x = Math.max(STAGE_PAD, Math.min(STAGE_W - STAGE_PAD, f.x))
  f.facing = f.x < other.x ? 1 : -1
}

function handleProjectileSpawn(f: Fighter, hooks: FightHooks): void {
  const fr = currentFrame(f)
  if (!fr.flags?.projectile) return
  if (f.frameTicks !== 0) return
  const heavy = f.moveId?.endsWith('H') ?? false
  hooks.spawnProjectile(f, fr.flags.projectile, heavy)
}

export function faceOpponent(f: Fighter, other: Fighter): void {
  if (!grounded(f) || !actionable(f)) return
  const dx = other.x - f.x
  if (Math.abs(dx) < 14) return
  f.facing = dx > 0 ? 1 : -1
}

export function tickFighter(f: Fighter, input: VirtualInput, hooks: FightHooks, locked: boolean): void {
  if (f.flash > 0) f.flash -= 1
  if (f.wakeupInvuln > 0) f.wakeupInvuln -= 1
  pushDir(f.buffer, input.dir, hooks.frame, f.facing)

  if (f.hitstop > 0) {
    f.hitstop -= 1
    return
  }

  if (f.status === 'ko' || f.status === 'win') {
    if (airborne(f)) f.vy += GRAVITY
    f.x += f.vx
    f.y += f.vy
    applyLand(f)
    advanceAnim(f)
    return
  }

  if (f.status === 'hurt' || f.status === 'block') {
    if (f.stun > 0) f.stun -= 1
    if (f.status === 'hurt' && f.stun <= 0 && f.reel <= 0) {
      if (f.pendingKd && grounded(f)) {
        f.pendingKd = false
        setAnim(f, 'knockdown', 'knockdown')
        f.vx = 0
      } else if (!airborne(f) && !f.pendingKd) {
        setAnim(f, 'idle', 'idle')
      }
    }
    if (f.status === 'block' && f.stun <= 0) {
      setAnim(f, crouching(input.dir) ? 'crouch' : 'idle', crouching(input.dir) ? 'crouch' : 'idle')
    }
  }

  const canAct =
    !locked &&
    (actionable(f) ||
      (f.status === 'jump' && !f.moveId) ||
      ((f.status === 'attack' || f.status === 'special') && f.canCancel))

  if (canAct && (f.status === 'attack' || f.status === 'special')) {
    tryCancel(f, input, hooks)
  } else if (canAct && !locked && f.status !== 'hurt' && f.status !== 'block' && f.status !== 'knockdown' && f.status !== 'wakeup' && f.status !== 'land' && f.status !== 'thrown') {
    if (actionable(f) && tryThrow(f, input, hooks.other)) {
      // thrown handled
    } else if (trySpecial(f, input, hooks)) {
      // special
    } else if (tryNormals(f, input)) {
      // normal
    } else {
      locomotion(f, input, locked)
    }
  } else if (f.status === 'land') {
    f.vx = 0
  }

  handleTeleport(f, hooks.other)
  handleProjectileSpawn(f, hooks)

  if (airborne(f) || f.vy < 0) f.vy += GRAVITY
  if (f.status === 'idle' || f.status === 'crouch' || f.status === 'block') f.vx = 0

  if (f.reel > 0) {
    f.vx = 0
    f.vy = 0
  }

  f.x += f.vx
  f.y += f.vy
  if (f.reel > 0) {
    const step = Math.min(f.reel, REEL_SPEED)
    f.x += f.reelDir * step
    f.reel -= step
    if (f.x < STAGE_PAD) {
      f.x = STAGE_PAD
      f.reel = 0
    }
    if (f.x > STAGE_W - STAGE_PAD) {
      f.x = STAGE_W - STAGE_PAD
      f.reel = 0
    }
  }
  applyLand(f)

  if (f.status === 'walk' || f.status === 'walkBack') {
    const rel = faceRel(input.dir, f.facing)
    if (rel === 6) f.vx = f.facing * f.def.walkSpeed
    else if (rel === 4) f.vx = -f.facing * f.def.backSpeed
  }

  advanceAnim(f)
}

export function dummyBlockInput(f: Fighter, other: Fighter): VirtualInput {
  const inp = emptyInput()
  const back = f.x < other.x ? 4 : 6
  const low = other.moveId?.startsWith('crouch') ? 1 : 0
  inp.dir = low ? (back === 4 ? 1 : 3) : back
  return inp
}
