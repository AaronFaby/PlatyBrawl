import { duckMusic } from './engine.ts'

const LINE: Record<string, string> = {
  'FIRST STRIKE!': 'First strike!',
  'COUNTER!': 'Counter!',
  'REVERSAL!': 'Reversal!',
  EXCELLENT: 'Excellent!',
  PERFECT: 'Perfect!',
  'DOUBLE K.O.': 'Double K.O.!',
}

const PRIORITY: Record<string, number> = {
  'DOUBLE K.O.': 6,
  PERFECT: 5,
  'FIRST STRIKE!': 4,
  'REVERSAL!': 3,
  'COUNTER!': 2,
  EXCELLENT: 1,
}

let spokenPriority = -1
let voice: SpeechSynthesisVoice | null | undefined

function synth(): SpeechSynthesis | null {
  if (typeof window === 'undefined' || typeof window.speechSynthesis === 'undefined') return null
  return window.speechSynthesis
}

function pickVoice(s: SpeechSynthesis): SpeechSynthesisVoice | null {
  if (voice !== undefined) return voice
  const voices = s.getVoices()
  if (!voices.length) return null
  voice =
    voices.find((v) => /en(-|_)US/i.test(v.lang) && /male|david|daniel|alex|fred|google us english/i.test(v.name)) ??
    voices.find((v) => /^en/i.test(v.lang) && /male|david|daniel|alex|fred/i.test(v.name)) ??
    voices.find((v) => /^en/i.test(v.lang)) ??
    voices[0]
  return voice
}

function bindVoices(s: SpeechSynthesis): void {
  if (typeof s.addEventListener === 'function') {
    s.addEventListener('voiceschanged', () => {
      voice = undefined
      pickVoice(s)
    })
  }
}

let bound = false

export function unlockAnnounce(): void {
  const s = synth()
  if (!s) return
  if (!bound) {
    bound = true
    bindVoices(s)
  }
  pickVoice(s)
  try {
    s.cancel()
    const warm = new SpeechSynthesisUtterance(' ')
    warm.volume = 0
    s.speak(warm)
    s.cancel()
  } catch {
    // Some engines reject a zero-volume warm-up; later speakCallout still runs.
  }
}

export function beginAnnounceFrame(): void {
  spokenPriority = -1
}

export function cancelAnnounce(): void {
  spokenPriority = -1
  try {
    synth()?.cancel()
  } catch {
    // ignore
  }
}

export function speakCallout(text: string): void {
  const s = synth()
  if (!s) return
  const line = LINE[text] ?? text.replace(/!/g, '')
  const pri = PRIORITY[text] ?? 0
  if (pri < spokenPriority) return
  spokenPriority = pri
  const u = new SpeechSynthesisUtterance(line)
  u.lang = 'en-US'
  u.rate = 0.92
  u.pitch = 0.72
  u.volume = 1
  const chosen = pickVoice(s)
  if (chosen) u.voice = chosen
  try {
    s.cancel()
    duckMusic(0.7)
    s.speak(u)
  } catch {
    // Speech can fail in locked autoplay contexts; the on-screen callout still shows.
  }
}
