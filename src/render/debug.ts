import { FONT } from '../config.ts'
import { worldBox } from '../fight/boxes.ts'
import { currentFrame } from '../fight/fighter.ts'
import type { FightWorld } from '../fight/match.ts'
import { projBox } from '../fight/projectile.ts'
import type { Cam } from './camera.ts'

export function drawDebug(ctx: CanvasRenderingContext2D, world: FightWorld, cam: Cam): void {
  for (const f of world.fighters) {
    const fr = currentFrame(f)
    drawBox(ctx, worldBox(fr.push, f.x, f.y, f.facing), cam, 'rgba(80,140,255,0.45)', 'rgba(80,140,255,0.9)')
    for (const h of fr.hurt) {
      drawBox(ctx, worldBox(h, f.x, f.y, f.facing), cam, 'rgba(80,220,80,0.25)', 'rgba(80,220,80,0.9)')
    }
    if (fr.hit) {
      for (const h of fr.hit) {
        drawBox(ctx, worldBox(h, f.x, f.y, f.facing), cam, 'rgba(255,60,60,0.35)', 'rgba(255,60,60,1)')
      }
    }
  }
  for (const p of world.match.projectiles) {
    drawBox(ctx, projBox(p), cam, 'rgba(255,180,40,0.3)', 'rgba(255,180,40,1)')
  }
  ctx.font = `6px ${FONT}`
  ctx.fillStyle = '#fff'
  ctx.textAlign = 'left'
  ctx.fillText(`F1 BOX  F2 DUMMY  F3 PAUSE  ${world.match.phase} r${world.match.round}`, 8, 262)
}

function drawBox(
  ctx: CanvasRenderingContext2D,
  b: { x: number; y: number; w: number; h: number },
  cam: Cam,
  fill: string,
  stroke: string,
): void {
  ctx.fillStyle = fill
  ctx.strokeStyle = stroke
  ctx.lineWidth = 1
  ctx.fillRect(b.x - cam.x, b.y - cam.y, b.w, b.h)
  ctx.strokeRect(b.x - cam.x + 0.5, b.y - cam.y + 0.5, b.w, b.h)
}
