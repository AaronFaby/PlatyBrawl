let ctx: AudioContext | null = null
let master: GainNode | null = null
let sfxBus: GainNode | null = null
let musicBus: GainNode | null = null
let muted = loadMuted()

function loadMuted(): boolean {
  try {
    return localStorage.getItem('platybrawlMusic') === 'off'
  } catch {
    return false
  }
}

export function ac(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext()
    master = ctx.createGain()
    master.gain.value = 0.28
    master.connect(ctx.destination)
    sfxBus = ctx.createGain()
    sfxBus.gain.value = 0.9
    sfxBus.connect(master)
    musicBus = ctx.createGain()
    musicBus.gain.value = muted ? 0 : 0.42
    musicBus.connect(master)
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

export function sfxDest(): AudioNode {
  ac()
  return sfxBus!
}

export function musicDest(): AudioNode {
  ac()
  return musicBus!
}

export function isMuted(): boolean {
  return muted
}

export function setMuted(on: boolean): void {
  muted = on
  try {
    localStorage.setItem('platybrawlMusic', on ? 'off' : 'on')
  } catch {
    // Storage can be unavailable in private contexts; muting should still work.
  }
  if (musicBus && ctx) {
    musicBus.gain.cancelScheduledValues(ctx.currentTime)
    musicBus.gain.setTargetAtTime(on ? 0 : 0.42, ctx.currentTime, 0.04)
  }
}

export function toggleMute(): boolean {
  setMuted(!muted)
  return muted
}

export function duckMusic(seconds = 0.35): void {
  if (!musicBus || !ctx || muted) return
  const t = ctx.currentTime
  musicBus.gain.cancelScheduledValues(t)
  musicBus.gain.setValueAtTime(0.12, t)
  musicBus.gain.linearRampToValueAtTime(0.42, t + seconds)
}

export function env(g: GainNode, t: number, peak: number, a: number, r: number): void {
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + Math.max(0.004, a))
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + r)
}

let noise: AudioBuffer | null = null

export function noiseBuf(): AudioBuffer {
  const c = ac()
  if (!noise) {
    noise = c.createBuffer(1, c.sampleRate * 0.4, c.sampleRate)
    const d = noise.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  }
  return noise
}

export function midi(n: number): number {
  return 440 * 2 ** ((n - 69) / 12)
}
