import { STAGE_W } from '../config.ts'
import type { Fighter, Projectile, ProjectileKind } from './types.ts'

export function spawnFrom(owner: Fighter, kind: ProjectileKind, heavy: boolean): Projectile {
  const facing = owner.facing
  if (kind === 'chain') {
    return {
      owner: owner.id,
      kind,
      x: owner.x + facing * 30,
      y: owner.y - 46,
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
      pull: 1,
    }
  }
  if (kind === 'bullet') {
    return {
      owner: owner.id,
      kind,
      x: owner.x + facing * 58,
      y: owner.y - 67,
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
    }
  }
  if (kind === 'shuriken') {
    return {
      owner: owner.id,
      kind,
      x: owner.x + facing * 22,
      y: owner.y - 38,
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
    }
  }
  return {
    owner: owner.id,
    kind,
    x: owner.x + facing * 18,
    y: owner.y - 42,
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
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i]
      const b = list[j]
      if (a.owner === b.owner) continue
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
