const MASTER_GAIN = 0.68
const SFX_GAIN = 1
const MUSIC_GAIN = 0.78
const MUSIC_DUCK = 0.22

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
    master.gain.value = MASTER_GAIN
    master.connect(ctx.destination)
    sfxBus = ctx.createGain()
    sfxBus.gain.value = SFX_GAIN
    sfxBus.connect(master)
    musicBus = ctx.createGain()
    musicBus.gain.value = muted ? 0 : MUSIC_GAIN
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

/** Open the music bus so a sample is audible even if mute is on. */
export function hearMusic(): void {
  ac()
  if (!musicBus || !ctx) return
  musicBus.gain.cancelScheduledValues(ctx.currentTime)
  musicBus.gain.setTargetAtTime(MUSIC_GAIN, ctx.currentTime, 0.03)
}

export function applyMusicGain(): void {
  if (!musicBus || !ctx) return
  musicBus.gain.cancelScheduledValues(ctx.currentTime)
  musicBus.gain.setTargetAtTime(muted ? 0 : MUSIC_GAIN, ctx.currentTime, 0.04)
}

export function setMuted(on: boolean): void {
  muted = on
  try {
    localStorage.setItem('platybrawlMusic', on ? 'off' : 'on')
  } catch {
    // Storage can be unavailable in private contexts; muting should still work.
  }
  applyMusicGain()
}

export function toggleMute(): boolean {
  setMuted(!muted)
  return muted
}

export function duckMusic(seconds = 0.35): void {
  if (!musicBus || !ctx || muted) return
  const t = ctx.currentTime
  musicBus.gain.cancelScheduledValues(t)
  musicBus.gain.setValueAtTime(MUSIC_DUCK, t)
  musicBus.gain.linearRampToValueAtTime(MUSIC_GAIN, t + seconds)
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
