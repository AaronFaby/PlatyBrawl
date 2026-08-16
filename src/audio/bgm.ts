import type { CharId } from '../config.ts'
import { ac, env, midi, musicDest, noiseBuf } from './engine.ts'

export type Track = 'title' | 'win' | CharId

type Voice = 'kick' | 'snare' | 'hat' | 'bass' | 'lead' | 'stab'

type Hit = { s: number; v: Voice; n?: number; l?: number }

const BPM: Record<Track, number> = {
  title: 126,
  win: 112,
  bob: 148,
  ninja: 176,
  cyber: 130,
  soldier: 108,
  chainsaw: 172,
}

type Kit = 'arcade' | 'stealth' | 'techno' | 'march' | 'grind'

function kitFor(track: Track): Kit {
  if (track === 'ninja') return 'stealth'
  if (track === 'cyber') return 'techno'
  if (track === 'soldier') return 'march'
  if (track === 'chainsaw') return 'grind'
  return 'arcade'
}

let trackGain: GainNode | null = null

function dest(): AudioNode {
  if (!trackGain) {
    const c = ac()
    trackGain = c.createGain()
    trackGain.gain.value = 1
    trackGain.connect(musicDest())
  }
  return trackGain
}

function killVoices(): void {
  if (!trackGain) return
  const c = ac()
  const g = trackGain
  trackGain = null
  g.gain.cancelScheduledValues(c.currentTime)
  g.gain.setValueAtTime(0, c.currentTime)
  try {
    g.disconnect()
  } catch {
    // already disconnected
  }
}

function osc(
  type: OscillatorType,
  freq: number,
  t: number,
  dur: number,
  peak: number,
  slide?: number,
): void {
  const c = ac()
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type
  o.frequency.setValueAtTime(Math.max(20, freq), t)
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + dur)
  env(g, t, peak, 0.004, dur)
  o.connect(g)
  g.connect(dest())
  o.start(t)
  o.stop(t + dur + 0.02)
}

function noiseBurst(t: number, dur: number, peak: number, freq: number, q = 0.7): void {
  const c = ac()
  const src = c.createBufferSource()
  src.buffer = noiseBuf()
  const f = c.createBiquadFilter()
  f.type = 'bandpass'
  f.frequency.value = freq
  f.Q.value = q
  const g = c.createGain()
  env(g, t, peak, 0.002, dur)
  src.connect(f)
  f.connect(g)
  g.connect(dest())
  src.start(t)
  src.stop(t + dur + 0.02)
}

function kick(t: number, kit: Kit): void {
  if (kit === 'techno') osc('sine', 80, t, 0.22, 0.62, 36)
  else if (kit === 'march') osc('sine', 110, t, 0.28, 0.5, 48)
  else if (kit === 'grind') {
    osc('sine', 180, t, 0.1, 0.5, 50)
    noiseBurst(t, 0.04, 0.12, 400)
  } else if (kit === 'stealth') osc('sine', 90, t, 0.18, 0.32, 40)
  else osc('sine', 150, t, 0.16, 0.55, 42)
}

function snare(t: number, kit: Kit): void {
  if (kit === 'march') {
    noiseBurst(t, 0.08, 0.42, 2400, 1.2)
    osc('triangle', 280, t, 0.06, 0.16, 140)
  } else if (kit === 'stealth') {
    osc('triangle', 620, t, 0.04, 0.14)
    noiseBurst(t, 0.05, 0.1, 3200, 2)
  } else if (kit === 'techno') {
    noiseBurst(t, 0.09, 0.3, 1200, 0.5)
  } else if (kit === 'grind') {
    noiseBurst(t, 0.07, 0.38, 900, 0.4)
    osc('square', 140, t, 0.05, 0.1, 70)
  } else {
    noiseBurst(t, 0.11, 0.28, 1800, 0.7)
    osc('triangle', 190, t, 0.08, 0.12, 90)
  }
}

function hat(t: number, open: boolean, kit: Kit): void {
  if (kit === 'stealth') {
    osc('sine', open ? 2100 : 2800, t, open ? 0.06 : 0.02, open ? 0.07 : 0.05)
    return
  }
  if (kit === 'techno') {
    noiseBurst(t, open ? 0.1 : 0.03, open ? 0.08 : 0.045, open ? 5000 : 8000, 0.4)
    return
  }
  if (kit === 'march') {
    noiseBurst(t, 0.03, 0.06, 4000, 1)
    return
  }
  if (kit === 'grind') {
    noiseBurst(t, 0.025, 0.05, 700, 0.3)
    return
  }
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

function bass(t: number, note: number, beats: number, stepSec: number, kit: Kit): void {
  const c = ac()
  const dur = Math.max(0.04, beats * stepSec * (kit === 'grind' ? 0.45 : 0.9))
  const o = c.createOscillator()
  const g = c.createGain()
  const f = c.createBiquadFilter()
  o.type = kit === 'techno' || kit === 'grind' ? 'sawtooth' : kit === 'stealth' ? 'sine' : kit === 'march' ? 'triangle' : 'square'
  o.frequency.setValueAtTime(midi(note), t)
  f.type = 'lowpass'
  const startF = kit === 'techno' ? 900 : kit === 'grind' ? 700 : kit === 'stealth' ? 280 : 420
  const endF = kit === 'techno' ? 220 : 160
  f.frequency.setValueAtTime(startF, t)
  f.frequency.exponentialRampToValueAtTime(endF, t + dur)
  env(g, t, kit === 'stealth' ? 0.14 : 0.2, 0.008, dur)
  o.connect(f)
  f.connect(g)
  g.connect(dest())
  if (kit === 'grind') {
    const o2 = c.createOscillator()
    o2.type = 'square'
    o2.frequency.setValueAtTime(midi(note) * 1.01, t)
    o2.connect(f)
    o2.start(t)
    o2.stop(t + dur + 0.02)
  }
  o.start(t)
  o.stop(t + dur + 0.02)
}

function lead(t: number, note: number, beats: number, stepSec: number, kit: Kit): void {
  const c = ac()
  const dur = Math.max(0.04, beats * stepSec * (kit === 'techno' ? 0.55 : kit === 'grind' ? 0.5 : 0.85))
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = kit === 'stealth' ? 'triangle' : kit === 'techno' || kit === 'grind' ? 'sawtooth' : 'square'
  o.frequency.setValueAtTime(midi(note), t)
  if (kit === 'grind') o.frequency.exponentialRampToValueAtTime(midi(note + 1), t + dur)
  env(g, t, kit === 'stealth' ? 0.13 : kit === 'march' ? 0.14 : 0.11, kit === 'stealth' ? 0.002 : 0.008, dur)
  o.connect(g)
  g.connect(dest())
  if (kit === 'march') {
    const o2 = c.createOscillator()
    o2.type = 'square'
    o2.frequency.setValueAtTime(midi(note + 7), t)
    const g2 = c.createGain()
    env(g2, t, 0.07, 0.01, dur)
    o2.connect(g2)
    g2.connect(dest())
    o2.start(t)
    o2.stop(t + dur + 0.02)
  } else if (kit === 'arcade') {
    const delay = c.createDelay()
    delay.delayTime.value = stepSec * 3
    const fb = c.createGain()
    fb.gain.value = 0.22
    const wet = c.createGain()
    wet.gain.value = 0.28
    g.connect(delay)
    delay.connect(fb)
    fb.connect(delay)
    delay.connect(wet)
    wet.connect(dest())
  }
  o.start(t)
  o.stop(t + dur + 0.02)
}

function stab(t: number, note: number, stepSec: number, kit: Kit): void {
  if (kit === 'stealth') {
    osc('triangle', midi(note + 12), t, stepSec * 2, 0.06)
    return
  }
  if (kit === 'techno') {
    noiseBurst(t, 0.08, 0.16, 2000, 0.8)
    osc('sawtooth', midi(note), t, 0.12, 0.08, midi(note) * 0.5)
    return
  }
  if (kit === 'grind') {
    noiseBurst(t, 0.14, 0.22, 500, 0.3)
    osc('sawtooth', midi(note), t, 0.16, 0.1, midi(note + 7))
    return
  }
  const offs = kit === 'march' ? [0, 4, 7] : [0, 3, 7]
  offs.forEach((off) => {
    osc(kit === 'march' ? 'square' : 'sawtooth', midi(note + off), t, stepSec * 1.6, 0.045)
  })
}

function playHit(h: Hit, t: number, stepSec: number, kit: Kit): void {
  if (h.v === 'kick') kick(t, kit)
  else if (h.v === 'snare') snare(t, kit)
  else if (h.v === 'hat') hat(t, h.n === 1, kit)
  else if (h.v === 'bass' && h.n !== undefined) bass(t, h.n, h.l ?? 2, stepSec, kit)
  else if (h.v === 'lead' && h.n !== undefined) lead(t, h.n, h.l ?? 2, stepSec, kit)
  else if (h.v === 'stab' && h.n !== undefined) stab(t, h.n, stepSec, kit)
}

function pushHook(hits: Hit[], hook: [number, number][], start: number): void {
  let s = start
  hook.forEach(([n, l]) => {
    if (n) hits.push({ s, v: 'lead', n, l })
    s += l * 2
  })
}

function pushBass(hits: Hit[], notes: number[], step = 4, len = 3): void {
  notes.forEach((n, i) => hits.push({ s: i * step, v: 'bass', n, l: len }))
}

function patternArcade(track: Track): { steps: number; hits: Hit[] } {
  const hits: Hit[] = []
  const bars = track === 'win' ? 4 : 8
  const steps = bars * 16
  for (let b = 0; b < bars; b++) {
    const o = b * 16
    hits.push({ s: o, v: 'kick' })
    hits.push({ s: o + 8, v: 'snare' })
    if (track === 'bob') {
      hits.push({ s: o + 4, v: 'kick' })
      if (b % 2 === 1) hits.push({ s: o + 14, v: 'kick' })
      if (b === 3 || b === 7) hits.push({ s: o + 10, v: 'snare' })
    }
    for (let i = 0; i < 16; i++) {
      if (i % 2 === 0) hits.push({ s: o + i, v: 'hat', n: i === 14 ? 1 : 0 })
      else if (track === 'bob') hits.push({ s: o + i, v: 'hat', n: 0 })
    }
  }
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
  if (track === 'title') {
    pushBass(hits, [D3, D3, D3, F3, G3, G3, F3, D3, Bb3, C4, D3, D3, C4, Bb3, A3, G3])
    ;[D4, F4, A4, D5, C5, A4, G4, F4].forEach((n, i) => {
      hits.push({ s: i * 4, v: 'lead', n, l: 3 })
      hits.push({ s: 32 + i * 4, v: 'lead', n: n + (i % 2 === 0 ? 12 : 0), l: 2 })
    })
    hits.push({ s: 0, v: 'stab', n: D3 })
    hits.push({ s: 64, v: 'stab', n: Bb3 - 12 })
  } else if (track === 'win') {
    pushBass(hits, [D3, D3, F3, G3, A3, A3, G3, F3])
    ;[D4, F4, A4, D5, F5, A4, G4, D4].forEach((n, i) => {
      hits.push({ s: i * 4, v: 'lead', n, l: 3 })
    })
    hits.push({ s: 0, v: 'stab', n: D3 })
  } else {
    pushBass(hits, [D3, D3, D3, F3, G3, G3, F3, D3, Bb3, C4, D3, D3, C4, Bb3, A3, G3])
    pushHook(hits, [
      [D5, 2], [F5, 2], [G5, 2], [A4, 4], [G4, 2], [F4, 2], [D4, 4], [0, 2],
      [Bb4, 2], [C5, 2], [D5, 4], [F5, 2], [D5, 2], [C5, 2], [Bb4, 2], [A4, 4],
    ], 0)
    pushHook(hits, [
      [D5, 2], [F5, 2], [G5, 2], [A4, 4], [G4, 2], [F4, 2], [D4, 4], [0, 2],
      [Bb4, 2], [C5, 2], [D5, 4], [F5, 2], [D5, 2], [C5, 2], [Bb4, 2], [A4, 4],
    ], 64)
    hits.push({ s: 0, v: 'stab', n: D3 })
    hits.push({ s: 32, v: 'stab', n: F3 })
    hits.push({ s: 64, v: 'stab', n: G3 })
    hits.push({ s: 96, v: 'stab', n: D3 })
  }
  return { steps, hits }
}

function patternNinja(): { steps: number; hits: Hit[] } {
  const hits: Hit[] = []
  const steps = 128
  for (let b = 0; b < 8; b++) {
    const o = b * 16
    hits.push({ s: o, v: 'kick' })
    if (b % 2 === 1) hits.push({ s: o + 10, v: 'kick' })
    hits.push({ s: o + 7, v: 'snare' })
    hits.push({ s: o + 15, v: 'snare' })
    for (const i of [3, 6, 11, 14]) hits.push({ s: o + i, v: 'hat', n: 0 })
  }
  pushBass(hits, [45, 45, 43, 45, 48, 48, 43, 45], 8, 7)
  pushHook(hits, [
    [81, 2], [0, 2], [84, 1], [81, 1], [0, 4], [76, 4], [0, 2], [79, 2], [81, 6], [0, 8],
  ], 0)
  pushHook(hits, [
    [79, 2], [81, 2], [84, 4], [0, 2], [76, 2], [72, 6], [0, 4], [69, 4], [72, 6],
  ], 64)
  hits.push({ s: 48, v: 'stab', n: 57 })
  hits.push({ s: 112, v: 'stab', n: 52 })
  return { steps, hits }
}

function patternCyber(): { steps: number; hits: Hit[] } {
  const hits: Hit[] = []
  const steps = 128
  for (let b = 0; b < 8; b++) {
    const o = b * 16
    for (const i of [0, 4, 8, 12]) hits.push({ s: o + i, v: 'kick' })
    hits.push({ s: o + 8, v: 'snare' })
    for (let i = 0; i < 16; i++) hits.push({ s: o + i, v: 'hat', n: i === 14 ? 1 : 0 })
    if (b % 2 === 1) hits.push({ s: o + 12, v: 'stab', n: 49 })
  }
  for (let i = 0; i < 32; i++) {
    const n = [37, 37, 44, 37][i % 4]
    hits.push({ s: i * 4, v: 'bass', n, l: 1 })
  }
  const arp = [61, 64, 68, 71]
  for (let i = 0; i < 64; i++) {
    hits.push({ s: i * 2, v: 'lead', n: arp[i % 4] + (i >= 32 && i % 8 >= 4 ? 12 : 0), l: 1 })
  }
  return { steps, hits }
}

function patternSoldier(): { steps: number; hits: Hit[] } {
  const hits: Hit[] = []
  const steps = 128
  for (let b = 0; b < 8; b++) {
    const o = b * 16
    hits.push({ s: o, v: 'kick' })
    hits.push({ s: o + 8, v: 'kick' })
    hits.push({ s: o + 4, v: 'snare' })
    hits.push({ s: o + 12, v: 'snare' })
    if (b % 2 === 1) {
      hits.push({ s: o + 5, v: 'snare' })
      hits.push({ s: o + 6, v: 'snare' })
      hits.push({ s: o + 13, v: 'snare' })
      hits.push({ s: o + 14, v: 'snare' })
    }
  }
  pushBass(hits, [36, 36, 43, 43, 36, 36, 43, 36], 8, 7)
  pushHook(hits, [
    [60, 3], [64, 1], [67, 2], [72, 4], [67, 2], [64, 2], [60, 6], [0, 4],
    [67, 3], [64, 1], [60, 4], [55, 8],
  ], 0)
  pushHook(hits, [
    [72, 2], [71, 2], [72, 2], [67, 4], [64, 2], [60, 4], [0, 2],
    [62, 2], [64, 2], [67, 4], [64, 2], [62, 2], [60, 6],
  ], 64)
  hits.push({ s: 0, v: 'stab', n: 48 })
  hits.push({ s: 64, v: 'stab', n: 43 })
  return { steps, hits }
}

function patternSaw(): { steps: number; hits: Hit[] } {
  const hits: Hit[] = []
  const steps = 128
  for (let b = 0; b < 8; b++) {
    const o = b * 16
    for (const i of [0, 2, 6, 8, 10]) hits.push({ s: o + i, v: 'kick' })
    hits.push({ s: o + 4, v: 'snare' })
    hits.push({ s: o + 12, v: 'snare' })
    for (const i of [1, 3, 5, 7, 9, 11, 13, 15]) hits.push({ s: o + i, v: 'hat', n: 0 })
    if (b % 2 === 0) hits.push({ s: o, v: 'stab', n: 40 })
  }
  for (let i = 0; i < 64; i++) {
    const n = [40, 40, 40, 41, 40, 40, 43, 40][i % 8]
    hits.push({ s: i * 2, v: 'bass', n, l: 1 })
  }
  pushHook(hits, [
    [64, 1], [65, 1], [64, 1], [67, 1], [64, 2], [0, 2], [70, 1], [71, 1], [70, 2], [64, 4],
    [0, 2], [65, 1], [64, 1], [62, 2], [64, 4],
  ], 0)
  pushHook(hits, [
    [76, 1], [77, 1], [76, 1], [79, 1], [76, 2], [0, 2], [71, 2], [70, 2], [64, 4],
    [65, 1], [64, 1], [65, 1], [67, 1], [64, 4],
  ], 64)
  return { steps, hits }
}

function pattern(track: Track): { steps: number; hits: Hit[] } {
  if (track === 'ninja') return patternNinja()
  if (track === 'cyber') return patternCyber()
  if (track === 'soldier') return patternSoldier()
  if (track === 'chainsaw') return patternSaw()
  return patternArcade(track)
}

let timer = 0
let current: Track | null = null
let gen = 0

function scheduleLoop(track: Track, when: number, id: number): void {
  if (id !== gen) return
  const c = ac()
  const bpm = BPM[track]
  if (!bpm) return
  const stepSec = 60 / bpm / 4
  const { steps, hits } = pattern(track)
  const loopDur = steps * stepSec
  for (const h of hits) {
    const t = when + h.s * stepSec
    if (t < c.currentTime - 0.02) continue
    try {
      playHit(h, t, stepSec, kitFor(track))
    } catch {
      // Late AudioParam ramps can throw if the context just resumed.
    }
  }
  const delay = Math.max(50, (when + loopDur - c.currentTime - 0.12) * 1000)
  timer = window.setTimeout(() => scheduleLoop(track, when + loopDur, id), delay)
}

function startTrack(track: Track, restart: boolean): void {
  const c = ac()
  if (!restart && current === track) return
  stopBgm()
  current = track
  gen += 1
  const id = gen
  dest()
  const kickOff = () => {
    if (id !== gen) return
    scheduleLoop(track, ac().currentTime + 0.08, id)
  }
  if (c.state === 'suspended') void c.resume().then(kickOff)
  else kickOff()
}

export function playBgm(track: Track): void {
  startTrack(track, false)
}

/** Restart this track from the top so a highlight always makes a sound. */
export function previewBgm(track: Track): void {
  startTrack(track, true)
}

export function stopBgm(): void {
  gen += 1
  current = null
  killVoices()
  if (timer) {
    clearTimeout(timer)
    timer = 0
  }
}

export function ensureBgm(track: Track): void {
  ac()
  if (current === track && timer) return
  startTrack(track, true)
}

/** Start the match theme once. Does not change mute. */
export function startFightBgm(track: Track): void {
  ac()
  startTrack(track, true)
}

export function trackReady(track: Track): boolean {
  return Number.isFinite(BPM[track]) && pattern(track).hits.length > 0
}
