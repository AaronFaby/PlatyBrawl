import { ac, duckMusic, env, midi, noiseBuf, sfxDest } from './engine.ts'

export { ac, isMuted, toggleMute } from './engine.ts'

function dest(): AudioNode {
  return sfxDest()
}

function tone(
  type: OscillatorType,
  freq: number,
  dur: number,
  peak: number,
  slide?: number,
  when = 0,
): void {
  const c = ac()
  const t = c.currentTime + when
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, t)
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + dur)
  env(g, t, peak, 0.004, dur)
  o.connect(g)
  g.connect(dest())
  o.start(t)
  o.stop(t + dur + 0.02)
}

function noiseHit(dur: number, peak: number, hp: number, when = 0): void {
  const c = ac()
  const t = c.currentTime + when
  const src = c.createBufferSource()
  src.buffer = noiseBuf()
  const f = c.createBiquadFilter()
  f.type = 'highpass'
  f.frequency.value = hp
  const g = c.createGain()
  env(g, t, peak, 0.002, dur)
  src.connect(f)
  f.connect(g)
  g.connect(dest())
  src.start(t)
  src.stop(t + dur + 0.02)
}

export function sfxSelect(): void {
  tone('square', 740, 0.07, 0.26, 1180)
}

export function sfxLock(): void {
  tone('square', 196, 0.12, 0.34, 392)
  tone('square', 247, 0.1, 0.2, 494, 0.04)
}

export function sfxWhoosh(): void {
  noiseHit(0.1, 0.22, 800)
  tone('sawtooth', 220, 0.11, 0.14, 70)
}

export function sfxHit(): void {
  noiseHit(0.09, 0.48, 300)
  tone('square', 160, 0.1, 0.42, 48)
  tone('triangle', 90, 0.08, 0.28, 40)
}

export function sfxBlock(): void {
  noiseHit(0.05, 0.24, 1800)
  tone('square', 640, 0.07, 0.26, 210)
}

export function sfxJump(): void {
  tone('square', 280, 0.1, 0.2, 520)
}

export function sfxSpecial(): void {
  noiseHit(0.12, 0.28, 600)
  tone('sawtooth', 320, 0.16, 0.24, 90)
  tone('square', 480, 0.1, 0.18, 160, 0.03)
}

export function sfxGun(): void {
  noiseHit(0.07, 0.52, 350)
  tone('square', 220, 0.07, 0.4, 48)
  tone('triangle', 80, 0.05, 0.28, 36)
}

export function sfxKo(): void {
  duckMusic(0.8)
  ;[midi(57), midi(53), midi(50), midi(45)].forEach((f, i) => {
    tone('square', f, 0.22, 0.32, f * 0.7, i * 0.08)
  })
  noiseHit(0.25, 0.22, 200, 0.02)
}

export function sfxStart(): void {
  ;[midi(67), midi(71), midi(74), midi(79)].forEach((f, i) => {
    tone('square', f, 0.14, 0.26, undefined, i * 0.06)
  })
}

export function sfxFight(): void {
  duckMusic(0.25)
  tone('square', midi(62), 0.18, 0.32)
  tone('square', midi(69), 0.18, 0.26, undefined, 0.05)
  noiseHit(0.12, 0.22, 400)
}

export function sfxWin(): void {
  ;[midi(62), midi(66), midi(69), midi(74), midi(81)].forEach((f, i) => {
    tone('square', f, 0.2, 0.26, undefined, i * 0.07)
    tone('triangle', f / 2, 0.22, 0.14, undefined, i * 0.07)
  })
}
