import type { CharId } from '../config.ts'
import { currentFrame } from '../fight/fighter.ts'
import type { Fighter } from '../fight/types.ts'
import type { Cam } from './camera.ts'
import { drawSpriteFighter } from './sprite.ts'

export function drawFighter(ctx: CanvasRenderingContext2D, f: Fighter, cam: Cam, t: number): void {
  if (drawSpriteFighter(ctx, f, cam)) return
  const x = f.x - cam.x
  const y = f.y - cam.y
  ctx.save()
  ctx.translate(Math.round(x), Math.round(y))
  ctx.scale(f.facing, 1)
  if (f.flash > 0 && f.flash % 2 === 0) ctx.globalAlpha = 0.45
  const bob = f.status === 'idle' ? Math.sin(t * 0.12 + f.id) * 1.2 : 0
  ctx.translate(0, bob)
  const fr = currentFrame(f)
  const pose = poseFrom(f, fr.cell)
  drawBody(ctx, f.charId, pose, f)
  ctx.restore()
}

type Pose = {
  squat: number
  lean: number
  arm: number
  kick: number
  bill: number
  air: number
  hurt: number
  sword: number
}

function poseFrom(f: Fighter, cell: number): Pose {
  const p: Pose = { squat: 0, lean: 0, arm: 0, kick: 0, bill: 0, air: 0, hurt: 0, sword: 0 }
  if (f.status === 'crouch' || f.status === 'land' || f.anim === 'crouchBlock' || f.anim.startsWith('crouch')) {
    p.squat = 0.7
  }
  if (f.status === 'jump' || f.y < 229) p.air = 1
  if (f.status === 'hurt' || f.status === 'ko') p.hurt = 1
  if (f.status === 'knockdown' || f.status === 'ko' && f.frameIndex > 0) {
    p.hurt = 1
    p.squat = 1
  }
  if (f.anim === 'walk' || f.anim === 'walkBack') {
    p.lean = f.anim === 'walk' ? 0.15 : -0.1
    p.arm = cell % 2 === 0 ? 0.3 : -0.3
    p.kick = cell % 2 === 0 ? -0.25 : 0.25
  }
  if (f.moveId?.includes('LP') || f.moveId === 'standLP' || f.moveId === 'crouchLP' || f.moveId === 'jumpLP') {
    p.arm = cell === 0 ? -0.4 : 1.1
    p.bill = cell >= 1 ? 1 : 0
  }
  if (f.moveId?.includes('HP') || f.moveId === 'standHP') {
    p.arm = cell === 0 ? -0.6 : 1.2
    p.lean = cell >= 1 ? 0.3 : -0.1
  }
  if (f.moveId?.includes('LK') || f.moveId === 'standLK') {
    p.kick = cell === 0 ? -0.3 : 1.1
  }
  if (f.moveId?.includes('HK') || f.moveId === 'standHK' || f.moveId === 'crouchHK' || f.moveId === 'jumpHK') {
    p.kick = cell === 0 ? -0.4 : 1.2
    p.lean = 0.2
  }
  if (f.moveId?.startsWith('billDrill')) {
    p.bill = 1
    p.lean = 0.5
    p.arm = Math.sin(f.frameTicks) * 1.2
  }
  if (f.moveId?.startsWith('venom')) {
    p.kick = cell >= 1 ? 1.3 : 0
    p.air = cell >= 1 ? 1 : 0
  }
  if (f.moveId?.startsWith('shuriken')) {
    p.arm = cell >= 1 ? 1 : -0.5
  }
  if (f.moveId?.startsWith('shadow')) {
    p.squat = 0.4
  }
  if (f.moveId?.startsWith('plasma')) {
    p.arm = cell >= 1 ? 1.2 : -0.3
  }
  if (f.moveId?.startsWith('rocket')) {
    p.kick = cell >= 1 ? 1.3 : 0
    p.lean = 0.5
  }
  if (f.moveId?.startsWith('pistol')) {
    p.arm = cell >= 1 ? 1.2 : -0.3
  }
  if (f.moveId?.startsWith('combatRush')) {
    p.arm = cell >= 1 ? 1.1 : -0.4
    p.lean = 0.5
  }
  if (f.charId === 'ninja') p.sword = p.arm > 0.5 ? 1.1 : 0.4
  return p
}

function drawBody(ctx: CanvasRenderingContext2D, id: CharId, pose: Pose, f: Fighter): void {
  const squat = pose.squat
  const bodyH = 28 - squat * 10
  const bodyY = -22 + squat * 10

  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.35)'
  ctx.beginPath()
  ctx.ellipse(0, 2, 16 - squat * 4, 4, 0, 0, Math.PI * 2)
  ctx.fill()

  if (f.status === 'knockdown' || (f.status === 'ko' && f.y >= 229)) {
    drawDowned(ctx, id)
    return
  }

  ctx.save()
  ctx.rotate(pose.lean * 0.25)
  ctx.translate(0, pose.air * -2)

  // tail
  ctx.fillStyle = tailColor(id)
  ctx.beginPath()
  ctx.ellipse(-20, bodyY + 6, 12, 5, -0.4, 0, Math.PI * 2)
  ctx.fill()

  // feet
  ctx.fillStyle = footColor(id)
  ctx.beginPath()
  ctx.ellipse(-6 + pose.kick * -4, 0, 8, 4, 0, 0, Math.PI * 2)
  ctx.ellipse(6 + pose.kick * 6, 0, 8, 4, 0, 0, Math.PI * 2)
  ctx.fill()

  // body
  ctx.fillStyle = bodyColor(id)
  ctx.beginPath()
  ctx.ellipse(0, bodyY, 16, bodyH * 0.55, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#1a1010'
  ctx.lineWidth = 1.5
  ctx.stroke()

  if (id === 'ninja') drawGi(ctx, bodyY, bodyH)
  if (id === 'cyber') drawCyber(ctx, bodyY)
  if (id === 'soldier') drawSoldier(ctx, bodyY)

  // arm
  ctx.fillStyle = id === 'cyber' ? '#8aa0b0' : bodyColor(id)
  ctx.beginPath()
  ctx.ellipse(8 + pose.arm * 10, bodyY - 2, 7, 4, pose.arm * 0.6, 0, Math.PI * 2)
  ctx.fill()

  // head
  ctx.fillStyle = bodyColor(id)
  ctx.beginPath()
  ctx.ellipse(6, bodyY - bodyH * 0.55, 11, 10, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#1a1010'
  ctx.stroke()

  // bill
  ctx.fillStyle = billColor(id)
  ctx.beginPath()
  ctx.ellipse(18 + pose.bill * 6, bodyY - bodyH * 0.5, 10 + pose.bill * 4, 4, 0.1, 0, Math.PI * 2)
  ctx.fill()

  // eye
  ctx.fillStyle = id === 'cyber' ? '#39f6ff' : '#1a1010'
  ctx.beginPath()
  ctx.arc(9, bodyY - bodyH * 0.6, id === 'cyber' ? 2.4 : 1.6, 0, Math.PI * 2)
  ctx.fill()
  if (id === 'cyber') {
    ctx.fillStyle = 'rgba(57,246,255,0.45)'
    ctx.beginPath()
    ctx.arc(9, bodyY - bodyH * 0.6, 4, 0, Math.PI * 2)
    ctx.fill()
  }

  if (id === 'ninja') {
    ctx.fillStyle = '#140c0c'
    ctx.fillRect(-2, bodyY - bodyH * 0.72, 16, 5)
    ctx.fillStyle = '#c42828'
    ctx.fillRect(-4, bodyY - bodyH * 0.78, 20, 2)
    // sword
    ctx.save()
    ctx.translate(10 + pose.sword * 14, bodyY - 4)
    ctx.rotate(-0.2 + pose.sword * 0.15)
    ctx.fillStyle = '#c8d0d8'
    ctx.fillRect(0, -2, 26, 3)
    ctx.fillStyle = '#2a1a12'
    ctx.fillRect(-4, -3, 6, 5)
    ctx.restore()
  }

  if (pose.hurt) {
    ctx.fillStyle = '#ff4d6a'
    ctx.fillRect(6, bodyY - bodyH * 0.7, 3, 3)
    ctx.fillRect(11, bodyY - bodyH * 0.55, 3, 3)
  }

  ctx.restore()
}

function drawDowned(ctx: CanvasRenderingContext2D, id: CharId): void {
  ctx.fillStyle = bodyColor(id)
  ctx.beginPath()
  ctx.ellipse(0, -8, 24, 10, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = billColor(id)
  ctx.beginPath()
  ctx.ellipse(20, -10, 10, 4, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = tailColor(id)
  ctx.beginPath()
  ctx.ellipse(-22, -6, 10, 4, 0, 0, Math.PI * 2)
  ctx.fill()
}

function drawGi(ctx: CanvasRenderingContext2D, bodyY: number, _bodyH: number): void {
  ctx.fillStyle = '#161010'
  ctx.beginPath()
  ctx.ellipse(0, bodyY + 2, 17, 14, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#c42828'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(-2, bodyY - 8)
  ctx.lineTo(4, bodyY + 10)
  ctx.stroke()
}

function drawCyber(ctx: CanvasRenderingContext2D, bodyY: number): void {
  ctx.fillStyle = '#8aa0b0'
  ctx.fillRect(4, bodyY - 8, 10, 14)
  ctx.fillStyle = '#39f6ff'
  ctx.fillRect(6, bodyY - 2, 6, 2)
  ctx.fillStyle = '#4a5560'
  ctx.fillRect(-4, bodyY + 8, 6, 8)
}

function drawSoldier(ctx: CanvasRenderingContext2D, bodyY: number): void {
  ctx.fillStyle = '#4a5c32'
  ctx.beginPath()
  ctx.ellipse(6, bodyY - 20, 12, 5, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#3a4a28'
  ctx.fillRect(-2, bodyY - 4, 16, 12)
  ctx.fillStyle = '#5a3a20'
  ctx.fillRect(-6, bodyY + 6, 5, 8)
}

function bodyColor(id: CharId): string {
  if (id === 'ninja') return '#7a4a28'
  if (id === 'cyber') return '#e6d2a8'
  if (id === 'soldier') return '#c8b080'
  return '#f0d8a8'
}

function billColor(id: CharId): string {
  if (id === 'cyber') return '#5a6570'
  return '#1a1210'
}

function tailColor(id: CharId): string {
  if (id === 'cyber') return '#6a7a88'
  if (id === 'ninja') return '#4a2a18'
  if (id === 'soldier') return '#3a2a18'
  return '#1a1210'
}

function footColor(id: CharId): string {
  if (id === 'cyber') return '#8aa0b0'
  if (id === 'ninja') return '#1a1010'
  if (id === 'soldier') return '#2a2418'
  return '#1a1210'
}
