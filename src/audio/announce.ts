import { ac, audioReady, duckMusic, sfxDest } from './engine.ts'

const LINE: Record<string, string> = {
  'FIRST STRIKE!': 'First strike!',
  'COUNTER!': 'Counter!',
  'REVERSAL!': 'Reversal!',
  EXCELLENT: 'Excellent!',
  PERFECT: 'Perfect!',
  'DOUBLE K.O.': 'Double K.O.!',
  'ROUND 1': 'Round 1!',
  'ROUND 2': 'Round 2!',
  'ROUND 3': 'Round 3!',
  ROUND: 'Round!',
  FIGHT: 'Fight!',
  'K.O.': 'K.O.!',
  TIME: 'Time!',
  'YOU WIN': 'You win!',
  'PLATY BRAWL!': 'Platy Brawl!',
}

const CLIP: Record<string, string> = {
  'FIRST STRIKE!': '/announce/first-strike.mp3',
  'COUNTER!': '/announce/counter.mp3',
  'REVERSAL!': '/announce/reversal.mp3',
  EXCELLENT: '/announce/excellent.mp3',
  PERFECT: '/announce/perfect.mp3',
  'DOUBLE K.O.': '/announce/double-ko.mp3',
  'ROUND 1': '/announce/round-1.mp3',
  'ROUND 2': '/announce/round-2.mp3',
  'ROUND 3': '/announce/round-3.mp3',
  ROUND: '/announce/round.mp3',
  FIGHT: '/announce/fight.mp3',
  'K.O.': '/announce/ko.mp3',
  TIME: '/announce/time.mp3',
  'YOU WIN': '/announce/you-win.mp3',
  'PLATY BRAWL!': '/announce/platy-brawl.mp3',
}

const PRIORITY: Record<string, number> = {
  'YOU WIN': 8,
  FIGHT: 7,
  TIME: 7,
  ROUND: 7,
  'ROUND 1': 7,
  'ROUND 2': 7,
  'ROUND 3': 7,
  'DOUBLE K.O.': 6,
  PERFECT: 5,
  'FIRST STRIKE!': 4,
  'K.O.': 4,
  'REVERSAL!': 3,
  'COUNTER!': 2,
  EXCELLENT: 1,
}

const ROUND_LINE = /^ROUND (\d+)$/

const CLIP_GAIN = 0.9

const buffers = new Map<string, AudioBuffer>()
const spoken: string[] = []

let spokenPriority = -1
let current: AudioBufferSourceNode | null = null
let loading: Promise<void> | null = null
let pending: string | null = null
let pendingGain = CLIP_GAIN
let titleAttract = true
let titlePlayed = false

function roundClip(text: string): string | undefined {
  const m = ROUND_LINE.exec(text)
  if (!m) return undefined
  const n = Number(m[1])
  if (n >= 1 && n <= 3) return `ROUND ${n}`
  return 'ROUND'
}

function clipKey(text: string): string | undefined {
  if (CLIP[text]) return text
  return roundClip(text)
}

function spokenLine(text: string): string {
  if (LINE[text]) return LINE[text]
  const m = ROUND_LINE.exec(text)
  if (m) return `Round ${m[1]}!`
  return text.replace(/!/g, '')
}

function priorityOf(text: string): number {
  if (PRIORITY[text] != null) return PRIORITY[text]
  if (ROUND_LINE.test(text)) return PRIORITY.ROUND
  return 0
}

function inPage(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
}

function hasWebAudio(): boolean {
  return typeof AudioContext !== 'undefined'
}

function audioRunning(): boolean {
  return hasWebAudio() && audioReady()
}

function flushPending(): void {
  if (!pending) return
  if (pending === 'PLATY BRAWL!' && (!titleAttract || titlePlayed)) {
    pending = null
    return
  }
  if (!audioRunning()) return
  const text = pending
  const gain = pendingGain
  pending = null
  play(text, gain)
}

function stopCurrent(): void {
  if (!current) return
  try {
    current.stop()
  } catch {
    // already stopped
  }
  current = null
}

async function loadClips(): Promise<void> {
  if (!inPage() || !hasWebAudio()) return
  const ctx = ac()
  await Promise.all(
    Object.entries(CLIP).map(async ([text, url]) => {
      if (buffers.has(text)) return
      const res = await fetch(url)
      if (!res.ok) throw new Error(`announce clip ${url} ${res.status}`)
      const raw = await res.arrayBuffer()
      buffers.set(text, await ctx.decodeAudioData(raw.slice(0)))
    }),
  )
  flushPending()
}

function ensureClips(): Promise<void> {
  if (!loading) {
    loading = loadClips().catch((err) => {
      loading = null
      console.warn('announce clips failed to load', err)
    })
  }
  return loading
}

function play(text: string, gain = CLIP_GAIN): void {
  const key = clipKey(text)
  const buf = key ? buffers.get(key) : undefined
  if (!key || !buf || !audioRunning()) {
    pending = text
    pendingGain = gain
    void ensureClips()
    return
  }
  pending = null
  if (text === 'PLATY BRAWL!') {
    titlePlayed = true
    spoken.push('Platy Brawl!')
  }
  stopCurrent()
  const ctx = ac()
  const src = ctx.createBufferSource()
  src.buffer = buf
  const g = ctx.createGain()
  g.gain.value = gain
  src.connect(g)
  g.connect(sfxDest())
  duckMusic(Math.max(0.7, buf.duration + 0.08))
  src.onended = () => {
    if (current === src) current = null
  }
  current = src
  src.start()
}

export function spokenCallouts(): readonly string[] {
  return spoken
}

export function unlockAnnounce(): void {
  if (!inPage() || !hasWebAudio()) return
  void ensureClips().then(() => flushPending())
}

export function beginAnnounceFrame(): void {
  spokenPriority = -1
}

export function cancelAnnounce(): void {
  spokenPriority = -1
  spoken.length = 0
  pending = null
  stopCurrent()
}

export function speakCallout(text: string): void {
  const pri = priorityOf(text)
  if (pri < spokenPriority) return
  spokenPriority = pri
  spoken.push(spokenLine(text))
  if (!clipKey(text) || !inPage() || !hasWebAudio()) return
  play(text)
}

export function armTitleAttract(): void {
  titleAttract = true
  titlePlayed = false
}

export function cancelTitleAttract(): void {
  titleAttract = false
  if (pending === 'PLATY BRAWL!') pending = null
}

export function speakTitle(): void {
  if (!titleAttract || titlePlayed || pending === 'PLATY BRAWL!') return
  if (!inPage() || !hasWebAudio()) {
    titlePlayed = true
    spoken.push('Platy Brawl!')
    return
  }
  play('PLATY BRAWL!', 1)
}
