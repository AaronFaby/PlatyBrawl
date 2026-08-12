import { faceRel, overlapCenter, overlaps, worldBox } from './boxes.ts'
import { airborne, currentFrame, grounded } from './fighter.ts'
import { projBox } from './projectile.ts'
import type { Box, Fighter, MatchState, MoveDef, Projectile } from './types.ts'
import type { VirtualInput } from '../input/virtual.ts'

function invuln(f: Fighter): boolean {
  if (f.wakeupInvuln > 0) return true
  if (f.status === 'ko' || f.status === 'thrown' || f.status === 'knockdown') return true
  const fr = currentFrame(f)
  return !!fr.flags?.invuln
}

function headInvuln(f: Fighter): boolean {
  return !!currentFrame(f).flags?.invulnHead
}

function canBlock(f: Fighter): boolean {
  return (
    grounded(f) &&
    f.status !== 'attack' &&
    f.status !== 'special' &&
    f.status !== 'hurt' &&
    f.status !== 'knockdown' &&
    f.status !== 'wakeup' &&
    f.status !== 'thrown' &&
    f.status !== 'ko' &&
    f.status !== 'throw'
  )
}

function isBlocking(f: Fighter, input: VirtualInput, height: MoveDef['height']): boolean {
  if (!canBlock(f) && f.status !== 'block') return false
  if (!holdingBack(input.dir, f.facing)) return false
  const crouch = input.dir === 1 || input.dir === 2 || input.dir === 3
  if (height === 'low' && !crouch) return false
  if (height === 'air') return false
  return true
}

function holdingBack(dir: number, facing: Fighter['facing']): boolean {
  const rel = faceRel(dir, facing)
  return rel === 1 || rel === 4 || rel === 7
}

function applyHit(
  attacker: Fighter,
  victim: Fighter,
  move: Pick<MoveDef, 'damage' | 'onHitStun' | 'onBlockStun' | 'hitstop' | 'knockdown' | 'launch' | 'height' | 'pushHit' | 'pushBlock'>,
  blocked: boolean,
  match: MatchState,
  contact: { x: number; y: number },
): void {
  const stop = blocked ? Math.max(2, move.hitstop - 2) : move.hitstop
  attacker.hitstop = stop
  victim.hitstop = stop
  match.hitstop = Math.max(match.hitstop, stop)
  match.sparks.push({ x: contact.x, y: contact.y, life: 8, max: 8 })
  if (!blocked && (move.hitstop >= 6 || move.knockdown || move.launch)) {
    match.shake = Math.max(match.shake, move.knockdown || move.launch ? 5 : 3)
  }

  const away = Math.sign(victim.x - attacker.x) || -attacker.facing

  if (blocked) {
    victim.status = 'block'
    victim.anim = inputCrouchAnim(victim)
    victim.frameIndex = 0
    victim.frameTicks = 0
    victim.stun = move.onBlockStun
    victim.vx = away * (move.pushBlock ?? 1.6)
    victim.moveId = null
    return
  }

  if (victim.armorLeft > 0) {
    victim.armorLeft -= 1
    victim.flash = 4
    victim.vx += away * 0.6
    return
  }

  victim.hp = Math.max(0, victim.hp - move.damage)
  victim.flash = 5
  victim.moveId = null
  victim.hasHit = false
  if (victim.hp <= 0) {
    victim.status = 'ko'
    victim.anim = 'ko'
    victim.frameIndex = 0
    victim.frameTicks = 0
    victim.stun = 0
    victim.vx = away * 3.2
    victim.vy = -3.4
    victim.pendingKd = false
    match.shake = 7
    return
  }

  victim.status = 'hurt'
  victim.anim = 'hurt'
  victim.frameIndex = 0
  victim.frameTicks = 0
  victim.stun = move.onHitStun
  victim.pendingKd = !!move.knockdown || !!move.launch
  victim.vx = away * (move.pushHit ?? 2.2)
  if (move.launch) victim.vy = -move.launch
  else if (airborne(victim) && move.knockdown) victim.vy = -2.4
}

function inputCrouchAnim(f: Fighter): string {
  return f.y >= 229 && (f.anim === 'crouch' || f.anim === 'crouchBlock') ? 'crouchBlock' : 'block'
}

function hurtWorld(f: Fighter): Box[] {
  return currentFrame(f).hurt.map((b) => worldBox(b, f.x, f.y, f.facing))
}

function hitWorld(f: Fighter): Box[] {
  const hits = currentFrame(f).hit
  if (!hits) return []
  return hits.map((b) => worldBox(b, f.x, f.y, f.facing))
}

export function resolveStrikes(
  a: Fighter,
  b: Fighter,
  aIn: VirtualInput,
  bIn: VirtualInput,
  match: MatchState,
): void {
  if (a.hitstop > 0 || b.hitstop > 0) return
  tryHit(a, b, bIn, match)
  tryHit(b, a, aIn, match)
}

function tryHit(attacker: Fighter, victim: Fighter, victimIn: VirtualInput, match: MatchState): void {
  if (!attacker.moveId || attacker.hasHit) return
  if (attacker.status !== 'attack' && attacker.status !== 'special') return
  if (invuln(victim)) return
  const move = attacker.def.moves[attacker.moveId]
  if (!move || move.damage <= 0) return
  const hits = hitWorld(attacker)
  if (hits.length === 0) return
  const hurts = hurtWorld(victim)
  if (hurts.length === 0) return

  for (const hit of hits) {
    for (const hurt of hurts) {
      if (!overlaps(hit, hurt)) continue
      if (headInvuln(victim) && hit.y + hit.h < victim.y - 28) continue
      const blocked = isBlocking(victim, victimIn, move.height)
      applyHit(attacker, victim, move, blocked, match, overlapCenter(hit, hurt))
      attacker.hasHit = true
      if (!blocked) attacker.canCancel = true
      return
    }
  }
}

export function resolveProjectiles(
  fighters: [Fighter, Fighter],
  inputs: [VirtualInput, VirtualInput],
  projectiles: Projectile[],
  match: MatchState,
): void {
  for (const p of projectiles) {
    if (p.hasHit) continue
    const victim = fighters[p.owner === 0 ? 1 : 0]
    const victimIn = inputs[victim.id]
    if (invuln(victim)) continue
    const pb = projBox(p)
    for (const hurt of hurtWorld(victim)) {
      if (!overlaps(pb, hurt)) continue
      const move = {
        damage: p.damage,
        onHitStun: p.onHitStun,
        onBlockStun: p.onBlockStun,
        hitstop: p.hitstop,
        height: p.height,
        pushHit: 1.6,
        pushBlock: 1.2,
      }
      const blocked = isBlocking(victim, victimIn, p.height)
      applyHit(fighters[p.owner], victim, move, blocked, match, overlapCenter(pb, hurt))
      p.hasHit = true
      break
    }
  }
}
