import { ac, env, isMuted, midi, musicDest, noiseBuf } from './engine.ts'

export type Track = 'title' | 'fight' | 'win'

type Voice = 'kick' | 'snare' | 'hat' | 'bass' | 'lead' | 'stab'

type Hit = { s: number; v: Voice; n?: number; l?: number }

const BPM: Record<Track, number> = { title: 126, fight: 148, win: 112 }

function dest(): AudioNode {
  return musicDest()
}

function kick(t: number): void {
  const c = ac()
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = 'sine'
  o.frequency.setValueAtTime(150, t)
  o.frequency.exponentialRampToValueAtTime(42, t + 0.12)
  env(g, t, 0.55, 0.003, 0.16)
  o.connect(g)
  g.connect(dest())
  o.start(t)
  o.stop(t + 0.2)
}

function snare(t: number): void {
  const c = ac()
  const src = c.createBufferSource()
  src.buffer = noiseBuf()
  const f = c.createBiquadFilter()
  f.type = 'bandpass'
  f.frequency.value = 1800
  f.Q.value = 0.7
  const g = c.createGain()
  env(g, t, 0.28, 0.002, 0.11)
  src.connect(f)
  f.connect(g)
  g.connect(dest())
  const o = c.createOscillator()
  const og = c.createGain()
  o.type = 'triangle'
  o.frequency.setValueAtTime(190, t)
  o.frequency.exponentialRampToValueAtTime(90, t + 0.08)
  env(og, t, 0.12, 0.002, 0.08)
  o.connect(og)
  og.connect(dest())
  src.start(t)
  src.stop(t + 0.14)
  o.start(t)
  o.stop(t + 0.12)
}

function hat(t: number, open = false): void {
  const c = ac()
  const src = c.createBufferSource()
  src.buffer = noiseBuf()
  const f = c.createBiquadFilter()
  f.type = 'highpass'
  f.frequency.value = open ? 6000 : 9000
  const g = c.createGain()
  env(g, t, open ? 0.1 : 0.055, 0.001, open ? 0.12 : 0.035)
  src.connect(f)
  f.connect(g)
  g.connect(dest())
  src.start(t)
  src.stop(t + (open ? 0.14 : 0.05))
}

function bass(t: number, note: number, beats: number, stepSec: number): void {
  const c = ac()
  const o = c.createOscillator()
  const g = c.createGain()
  const f = c.createBiquadFilter()
  o.type = 'square'
  o.frequency.setValueAtTime(midi(note), t)
  f.type = 'lowpass'
  f.frequency.setValueAtTime(420, t)
  f.frequency.exponentialRampToValueAtTime(180, t + beats * stepSec)
  env(g, t, 0.18, 0.01, beats * stepSec * 0.9)
  o.connect(f)
  f.connect(g)
  g.connect(dest())
  o.start(t)
  o.stop(t + beats * stepSec + 0.02)
}

function lead(t: number, note: number, beats: number, stepSec: number): void {
  const c = ac()
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = 'square'
  o.frequency.setValueAtTime(midi(note), t)
  env(g, t, 0.11, 0.008, beats * stepSec * 0.85)
  const delay = c.createDelay()
  delay.delayTime.value = stepSec * 3
  const fb = c.createGain()
  fb.gain.value = 0.22
  const wet = c.createGain()
  wet.gain.value = 0.28
  o.connect(g)
  g.connect(dest())
  g.connect(delay)
  delay.connect(fb)
  fb.connect(delay)
  delay.connect(wet)
  wet.connect(dest())
  o.start(t)
  o.stop(t + beats * stepSec + 0.02)
}

function stab(t: number, note: number, stepSec: number): void {
  const c = ac()
  ;[0, 3, 7].forEach((off) => {
    const o = c.createOscillator()
    const g = c.createGain()
    o.type = 'sawtooth'
    o.frequency.setValueAtTime(midi(note + off), t)
    env(g, t, 0.045, 0.006, stepSec * 1.6)
    const f = c.createBiquadFilter()
    f.type = 'lowpass'
    f.frequency.value = 900
    o.connect(f)
    f.connect(g)
    g.connect(dest())
    o.start(t)
    o.stop(t + stepSec * 2)
  })
}

function playHit(h: Hit, t: number, stepSec: number): void {
  if (h.v === 'kick') kick(t)
  else if (h.v === 'snare') snare(t)
  else if (h.v === 'hat') hat(t, h.n === 1)
  else if (h.v === 'bass' && h.n !== undefined) bass(t, h.n, h.l ?? 2, stepSec)
  else if (h.v === 'lead' && h.n !== undefined) lead(t, h.n, h.l ?? 2, stepSec)
  else if (h.v === 'stab' && h.n !== undefined) stab(t, h.n, stepSec)
}

function pattern(track: Track): { steps: number; hits: Hit[] } {
  const hits: Hit[] = []
  const bars = track === 'win' ? 4 : 8
  const steps = bars * 16

  for (let b = 0; b < bars; b++) {
    const o = b * 16
    hits.push({ s: o, v: 'kick' })
    hits.push({ s: o + 8, v: 'snare' })
    if (track === 'fight') {
      hits.push({ s: o + 4, v: 'kick' })
      if (b % 2 === 1) hits.push({ s: o + 14, v: 'kick' })
      if (b === 3 || b === 7) hits.push({ s: o + 10, v: 'snare' })
    }
    for (let i = 0; i < 16; i++) {
      if (i % 2 === 0) hits.push({ s: o + i, v: 'hat', n: i === 14 ? 1 : 0 })
      else if (track === 'fight') hits.push({ s: o + i, v: 'hat', n: 0 })
    }
  }

  // D phrygian-ish: D Eb F G A Bb C
  const D3 = 50
  const F3 = 53
  const G3 = 55
  const A3 = 57
  const Bb3 = 58
  const C4 = 60
  const D4 = 62
  const F4 = 65
  const G4 = 67
  const A4 = 69
  const Bb4 = 70
  const C5 = 72
  const D5 = 74
  const F5 = 77
  const G5 = 79

  const bassLine =
    track === 'win'
      ? [D3, D3, F3, G3, A3, A3, G3, F3]
      : [D3, D3, D3, F3, G3, G3, F3, D3, Bb3, C4, D3, D3, C4, Bb3, A3, G3]
  bassLine.forEach((n, i) => {
    hits.push({ s: i * 4, v: 'bass', n, l: 3 })
  })

  if (track === 'title') {
    const arp = [D4, F4, A4, D5, C5, A4, G4, F4]
    arp.forEach((n, i) => {
      hits.push({ s: i * 4, v: 'lead', n, l: 3 })
      hits.push({ s: 32 + i * 4, v: 'lead', n: n + (i % 2 === 0 ? 12 : 0), l: 2 })
    })
    hits.push({ s: 0, v: 'stab', n: D3 })
    hits.push({ s: 64, v: 'stab', n: Bb3 - 12 })
  } else if (track === 'fight') {
    const hook = [
      [D5, 2],
      [F5, 2],
      [G5, 2],
      [A4, 4],
      [G4, 2],
      [F4, 2],
      [D4, 4],
      [0, 2],
      [Bb4, 2],
      [C5, 2],
      [D5, 4],
      [F5, 2],
      [D5, 2],
      [C5, 2],
      [Bb4, 2],
      [A4, 4],
    ] as [number, number][]
    let s = 0
    hook.forEach(([n, l]) => {
      if (n) hits.push({ s, v: 'lead', n, l })
      s += l * 2
    })
    s = 64
    hook.forEach(([n, l]) => {
      if (n) hits.push({ s, v: 'lead', n: n + (s > 96 ? -12 : 0), l })
      s += l * 2
    })
    hits.push({ s: 0, v: 'stab', n: D3 })
    hits.push({ s: 32, v: 'stab', n: F3 })
    hits.push({ s: 64, v: 'stab', n: G3 })
    hits.push({ s: 96, v: 'stab', n: D3 })
  } else {
    ;[D4, F4, A4, D5, F5, A4, G4, D4].forEach((n, i) => {
      hits.push({ s: i * 4, v: 'lead', n, l: 3 })
    })
    hits.push({ s: 0, v: 'stab', n: D3 })
  }

  return { steps, hits }
}

let timer = 0
let current: Track | null = null
let gen = 0

function scheduleLoop(track: Track, when: number, id: number): void {
  if (id !== gen) return
  const c = ac()
  const stepSec = 60 / BPM[track] / 4
  const { steps, hits } = pattern(track)
  const loopDur = steps * stepSec
  for (const h of hits) {
    const t = when + h.s * stepSec
    if (t >= c.currentTime - 0.02) playHit(h, t, stepSec)
  }
  const delay = Math.max(50, (when + loopDur - c.currentTime - 0.12) * 1000)
  timer = window.setTimeout(() => scheduleLoop(track, when + loopDur, id), delay)
}

export function playBgm(track: Track): void {
  ac()
  if (current === track) return
  stopBgm()
  current = track
  gen += 1
  const id = gen
  const start = ac().currentTime + 0.06
  scheduleLoop(track, start, id)
}

export function stopBgm(): void {
  gen += 1
  current = null
  if (timer) {
    clearTimeout(timer)
    timer = 0
  }
}

export function ensureBgm(track: Track): void {
  ac()
  if (isMuted()) return
  playBgm(track)
}
