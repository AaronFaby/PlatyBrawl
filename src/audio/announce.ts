import { ac, duckMusic, sfxDest } from './engine.ts'

const LINE: Record<string, string> = {
  'FIRST STRIKE!': 'First strike!',
  'COUNTER!': 'Counter!',
  'REVERSAL!': 'Reversal!',
  EXCELLENT: 'Excellent!',
  PERFECT: 'Perfect!',
  'DOUBLE K.O.': 'Double K.O.!',
}

const CLIP: Record<string, string> = {
  'FIRST STRIKE!': '/announce/first-strike.mp3',
  'COUNTER!': '/announce/counter.mp3',
  'REVERSAL!': '/announce/reversal.mp3',
  EXCELLENT: '/announce/excellent.mp3',
  PERFECT: '/announce/perfect.mp3',
  'DOUBLE K.O.': '/announce/double-ko.mp3',
}

const PRIORITY: Record<string, number> = {
  'DOUBLE K.O.': 6,
  PERFECT: 5,
  'FIRST STRIKE!': 4,
  'REVERSAL!': 3,
  'COUNTER!': 2,
  EXCELLENT: 1,
}

const CLIP_GAIN = 0.9

const buffers = new Map<string, AudioBuffer>()
const spoken: string[] = []

let spokenPriority = -1
let current: AudioBufferSourceNode | null = null
let loading: Promise<void> | null = null
let pending: string | null = null

function inPage(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
}

function hasWebAudio(): boolean {
  return typeof AudioContext !== 'undefined'
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
  if (pending && buffers.has(pending)) {
    const text = pending
    pending = null
    play(text)
  }
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

function play(text: string): void {
  const buf = buffers.get(text)
  if (!buf) {
    pending = text
    void ensureClips()
    return
  }
  pending = null
  if (!hasWebAudio()) return
  stopCurrent()
  const ctx = ac()
  const src = ctx.createBufferSource()
  src.buffer = buf
  const g = ctx.createGain()
  g.gain.value = CLIP_GAIN
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
  void ensureClips()
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
  const line = LINE[text] ?? text.replace(/!/g, '')
  const pri = PRIORITY[text] ?? 0
  if (pri < spokenPriority) return
  spokenPriority = pri
  spoken.push(line)
  if (!CLIP[text] || !inPage() || !hasWebAudio()) return
  play(text)
}
