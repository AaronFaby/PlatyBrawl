import { LOGICAL_H, LOGICAL_W } from '../config.ts'

export type View = {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  buffer: HTMLCanvasElement
  btx: CanvasRenderingContext2D
  scale: number
  ox: number
  oy: number
}

export function createView(canvas: HTMLCanvasElement): View {
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('no 2d')
  const buffer = document.createElement('canvas')
  buffer.width = LOGICAL_W
  buffer.height = LOGICAL_H
  const btx = buffer.getContext('2d')
  if (!btx) throw new Error('no buffer')
  const view: View = { canvas, ctx, buffer, btx, scale: 1, ox: 0, oy: 0 }
  resizeView(view)
  window.addEventListener('resize', () => resizeView(view))
  return view
}

export function resizeView(view: View): void {
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1))
  const w = window.innerWidth
  const h = window.innerHeight
  view.canvas.width = Math.floor(w * dpr)
  view.canvas.height = Math.floor(h * dpr)
  view.canvas.style.width = `${w}px`
  view.canvas.style.height = `${h}px`
  const fit = Math.min(w / LOGICAL_W, h / LOGICAL_H)
  const snapped = Math.floor(fit)
  view.scale = snapped >= 1 ? snapped : fit
  const dw = LOGICAL_W * view.scale
  const dh = LOGICAL_H * view.scale
  view.ox = Math.floor((w - dw) / 2)
  view.oy = Math.floor((h - dh) / 2)
  view.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  view.ctx.imageSmoothingEnabled = false
  const c = view.ctx as CanvasRenderingContext2D & {
    webkitImageSmoothingEnabled?: boolean
    mozImageSmoothingEnabled?: boolean
  }
  c.webkitImageSmoothingEnabled = false
  c.mozImageSmoothingEnabled = false
  view.btx.imageSmoothingEnabled = false
}

export function present(view: View, scanlines = true): void {
  const { ctx, canvas, buffer, scale, ox, oy } = view
  const cssW = canvas.width / Math.max(1, Math.min(2, window.devicePixelRatio || 1))
  const cssH = canvas.height / Math.max(1, Math.min(2, window.devicePixelRatio || 1))
  ctx.fillStyle = '#050308'
  ctx.fillRect(0, 0, cssW, cssH)
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(buffer, 0, 0, LOGICAL_W, LOGICAL_H, ox, oy, LOGICAL_W * scale, LOGICAL_H * scale)
  if (scanlines) {
    ctx.fillStyle = 'rgba(0,0,0,0.18)'
    const h = LOGICAL_H * scale
    for (let y = 0; y < h; y += 2) ctx.fillRect(ox, oy + y, LOGICAL_W * scale, 1)
  }
}
