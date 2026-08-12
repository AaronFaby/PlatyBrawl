import { GROUND_Y, LOGICAL_H, LOGICAL_W, STAGE_W } from '../config.ts'
import type { StageId } from '../data/stages.ts'
import type { Cam } from './camera.ts'
import { bank } from './sprite.ts'

const GROUND: Record<StageId, { lip: string; mid: string; deep: string; wash: string }> = {
  billabong: { lip: '#6a4830', mid: '#4a301c', deep: '#2a1810', wash: 'rgba(10,4,12,0.12)' },
  dojo: { lip: '#7a5468', mid: '#3a2834', deep: '#181018', wash: 'rgba(16,6,22,0.14)' },
  neonlab: { lip: '#3ad8e8', mid: '#1a2438', deep: '#0a101c', wash: 'rgba(8,4,24,0.16)' },
}

export function drawStage(ctx: CanvasRenderingContext2D, cam: Cam, t: number, stageId: StageId = 'billabong'): void {
  const img = bank.stages[stageId] ?? bank.stages.billabong
  if (img) {
    const srcW = img.width
    const srcH = img.height
    const viewW = LOGICAL_W
    const viewH = LOGICAL_H
    const scale = Math.max(viewH / srcH, (STAGE_W / srcW) * 0.7)
    const dw = srcW * scale
    const dh = srcH * scale
    const sx = (cam.x / STAGE_W) * Math.max(0, dw - viewW)
    const pal = GROUND[stageId]
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(img, -sx, GROUND_Y - dh + 18, dw, dh)
    ctx.fillStyle = pal.wash
    ctx.fillRect(0, 0, LOGICAL_W, GROUND_Y)
    ctx.fillStyle = pal.mid
    ctx.fillRect(0, GROUND_Y, LOGICAL_W, 5)
    ctx.fillStyle = pal.deep
    ctx.fillRect(0, GROUND_Y + 5, LOGICAL_W, LOGICAL_H - GROUND_Y - 5)
    ctx.fillStyle = pal.lip
    ctx.fillRect(0, GROUND_Y, LOGICAL_W, 2)
    return
  }
  const g = ctx.createLinearGradient(0, 0, 0, LOGICAL_H)
  g.addColorStop(0, '#1a1030')
  g.addColorStop(0.45, '#3a1848')
  g.addColorStop(0.7, '#6a2a3a')
  g.addColorStop(1, '#1a0c14')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H)

  // far hills
  const par = cam.x * 0.25
  ctx.fillStyle = '#24102a'
  ctx.beginPath()
  ctx.moveTo(-20, 150)
  for (let x = 0; x <= LOGICAL_W + 40; x += 40) {
    const hx = x + 20
    const hy = 118 + Math.sin((x + par) * 0.02) * 16
    ctx.lineTo(hx, hy)
  }
  ctx.lineTo(LOGICAL_W + 20, 180)
  ctx.lineTo(-20, 180)
  ctx.fill()

  // sun
  ctx.fillStyle = '#ffb070'
  ctx.beginPath()
  ctx.arc(360 - cam.x * 0.08, 70, 22, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,140,80,0.25)'
  ctx.beginPath()
  ctx.arc(360 - cam.x * 0.08, 70, 40, 0, Math.PI * 2)
  ctx.fill()

  // mid water
  const wp = cam.x * 0.55
  ctx.fillStyle = '#1a3a58'
  ctx.fillRect(0, 168, LOGICAL_W, GROUND_Y - 168)
  ctx.fillStyle = '#245878'
  for (let i = 0; i < 18; i++) {
    const x = ((i * 48 - wp) % (LOGICAL_W + 48)) - 24
    ctx.fillRect(x, 176 + Math.sin(t * 0.08 + i) * 2, 28, 2)
  }

  // dock piles
  const np = cam.x
  ctx.fillStyle = '#3a2418'
  for (let i = 0; i < 10; i++) {
    const x = i * 80 - (np % 80)
    ctx.fillRect(x, 188, 8, GROUND_Y - 188)
    ctx.fillStyle = '#2a1810'
    ctx.fillRect(x + 8, 188, 3, GROUND_Y - 188)
    ctx.fillStyle = '#3a2418'
  }

  // ground
  ctx.fillStyle = '#4a3020'
  ctx.fillRect(0, GROUND_Y, LOGICAL_W, LOGICAL_H - GROUND_Y)
  ctx.fillStyle = '#6a4830'
  ctx.fillRect(0, GROUND_Y, LOGICAL_W, 4)
  ctx.fillStyle = '#3a2014'
  for (let i = 0; i < 24; i++) {
    const x = ((i * 36 - np) % (LOGICAL_W + 36)) - 12
    ctx.fillRect(x, GROUND_Y + 8 + (i % 3) * 6, 14, 3)
  }

  // neon sign far
  ctx.save()
  ctx.translate(560 - cam.x * 0.4, 88)
  ctx.fillStyle = '#220814'
  ctx.fillRect(-6, -18, 70, 22)
  ctx.fillStyle = '#ff3d7f'
  ctx.font = '8px "Press Start 2P"'
  ctx.fillText('BILLABONG', 0, 0)
  ctx.restore()

  // side walls hint
  if (cam.x < 8) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)'
    ctx.fillRect(0, 0, 10, LOGICAL_H)
  }
  if (cam.x > STAGE_W - LOGICAL_W - 8) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)'
    ctx.fillRect(LOGICAL_W - 10, 0, 10, LOGICAL_H)
  }
}
