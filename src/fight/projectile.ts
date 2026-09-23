import { SPRITE_ORIGIN_X, SPRITE_ORIGIN_Y, spriteDrawScale } from '../assets/manifest.ts'
import { STAGE_W } from '../config.ts'
import type { Fighter, Projectile, ProjectileKind } from './types.ts'

type Muzzle = { px: number; py: number; idleH: number; poseH: number }

/** Firing-pose sprite pixel of the muzzle. Heights are packed opaque bounds. */
const MUZZLE: Record<ProjectileKind, Muzzle> = {
  bullet: { px: 155, py: 60, idleH: 150, poseH: 134 },
  shuriken: { px: 150, py: 100, idleH: 108, poseH: 106 },
  beam: { px: 106, py: 96, idleH: 137, poseH: 114 },
  chain: { px: 153, py: 85, idleH: 120, poseH: 103 },
  gas: { px: 150, py: 86, idleH: 148, poseH: 115 },
}

const CHAIN_HAND: Muzzle = { px: 122, py: 86, idleH: 120, poseH: 103 }

export function muzzleWorld(
  owner: { x: number; y: number; facing: 1 | -1 },
  spec: Muzzle,
): { x: number; y: number } {
  const scale = spriteDrawScale(spec.idleH, spec.poseH, false)
  return {
    x: owner.x + owner.facing * (spec.px - SPRITE_ORIGIN_X) * scale,
    y: owner.y + (spec.py - SPRITE_ORIGIN_Y) * scale,
  }
}

export function chainHandWorld(owner: { x: number; y: number; facing: 1 | -1 }): { x: number; y: number } {
  return muzzleWorld(owner, CHAIN_HAND)
}

export function spawnFrom(owner: Fighter, kind: ProjectileKind, heavy: boolean): Projectile {
  const facing = owner.facing
  const reversal = owner.reversal
  const muzzle = muzzleWorld(owner, MUZZLE[kind])
  if (kind === 'chain') {
    return {
      owner: owner.id,
      kind,
      x: muzzle.x,
      y: muzzle.y,
      vx: facing * (heavy ? 4.8 : 3.8),
      w: 14,
      h: 10,
      damage: heavy ? 65 : 50,
      onHitStun: heavy ? 20 : 16,
      onBlockStun: heavy ? 12 : 10,
      hitstop: heavy ? 6 : 5,
      height: 'high',
      life: heavy ? 88 : 78,
      hasHit: false,
      facing,
      reversal,
      pull: 1,
    }
  }
  if (kind === 'bullet') {
    return {
      owner: owner.id,
      kind,
      x: muzzle.x,
      y: muzzle.y,
      vx: facing * (heavy ? 5.4 : 4.0),
      w: 12,
      h: 6,
      damage: heavy ? 85 : 65,
      onHitStun: heavy ? 16 : 14,
      onBlockStun: 10,
      hitstop: heavy ? 6 : 4,
      height: 'high',
      life: heavy ? 70 : 80,
      hasHit: false,
      facing,
      reversal,
    }
  }
  if (kind === 'gas') {
    return {
      owner: owner.id,
      kind,
      x: muzzle.x,
      y: muzzle.y,
      vx: facing * (heavy ? 3.2 : 2.2),
      w: 12,
      h: 12,
      damage: heavy ? 50 : 35,
      onHitStun: heavy ? 14 : 12,
      onBlockStun: 8,
      hitstop: 4,
      height: 'high',
      life: heavy ? 78 : 70,
      hasHit: false,
      facing,
      reversal,
      poison: heavy
        ? { damage: 8, interval: 60, duration: 720 }
        : { damage: 5, interval: 60, duration: 480 },
    }
  }
  if (kind === 'shuriken') {
    return {
      owner: owner.id,
      kind,
      x: muzzle.x,
      y: muzzle.y,
      vx: facing * (heavy ? 3.6 : 2.3),
      w: 10,
      h: 10,
      damage: heavy ? 70 : 60,
      onHitStun: 14,
      onBlockStun: 10,
      hitstop: 4,
      height: 'high',
      life: 90,
      hasHit: false,
      facing,
      reversal,
    }
  }
  return {
    owner: owner.id,
    kind,
    x: muzzle.x,
    y: muzzle.y,
    vx: 0,
    w: heavy ? 220 : 180,
    h: heavy ? 16 : 10,
    damage: heavy ? 100 : 80,
    onHitStun: heavy ? 18 : 16,
    onBlockStun: heavy ? 18 : 14,
    hitstop: heavy ? 8 : 6,
    height: 'high',
    life: heavy ? 10 : 8,
    hasHit: false,
    facing,
    reversal,
  }
}

export function projBox(p: Projectile): { x: number; y: number; w: number; h: number } {
  if (p.kind === 'beam') {
    const x = p.facing === 1 ? p.x : p.x - p.w
    return { x, y: p.y - p.h / 2, w: p.w, h: p.h }
  }
  return { x: p.x - p.w / 2, y: p.y - p.h / 2, w: p.w, h: p.h }
}

export function tickProjectiles(list: Projectile[]): void {
  for (const p of list) {
    if (p.tether == null) p.x += p.vx
    p.life -= 1
  }
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i]
    if (p.life <= 0 || p.x < -40 || p.x > STAGE_W + 40) {
      list.splice(i, 1)
      continue
    }
    if (p.hasHit && p.tether == null) list.splice(i, 1)
  }
}

export function clashProjectiles(list: Projectile[]): void {
  for (let i = 0; i < list.length; i++) {
    if (list[i].hasHit) continue
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i]
      const b = list[j]
      if (a.hasHit) break
      if (b.hasHit || a.owner === b.owner) continue
      const A = projBox(a)
      const B = projBox(b)
      const hit =
        A.x < B.x + B.w && A.x + A.w > B.x && A.y < B.y + B.h && A.y + A.h > B.y
      if (hit) {
        a.hasHit = true
        b.hasHit = true
      }
    }
  }
}
