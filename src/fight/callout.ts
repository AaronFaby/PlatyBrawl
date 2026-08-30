import { beginAnnounceFrame, cancelAnnounce, speakCallout } from '../audio/announce.ts'
import type { Fighter, MatchState } from './types.ts'

export const EXCELLENT_HITS = 4
export const CALLOUT_LIFE = 90
export const REVERSAL_WINDOW = 10

export const CALLOUT = {
  first: 'FIRST STRIKE!',
  counter: 'COUNTER!',
  reversal: 'REVERSAL!',
  excellent: 'EXCELLENT',
  perfect: 'PERFECT',
  double: 'DOUBLE K.O.',
} as const

const FILL: Record<string, string> = {
  [CALLOUT.first]: '#fff4c8',
  [CALLOUT.counter]: '#ff6b4a',
  [CALLOUT.reversal]: '#5ad6e8',
  [CALLOUT.excellent]: '#ffe14a',
  [CALLOUT.perfect]: '#ffe14a',
  [CALLOUT.double]: '#ff8aa8',
}

export function resetCallouts(match: MatchState): void {
  pending = []
  match.firstStrike = false
  match.streak = [0, 0]
  match.callouts = []
  cancelAnnounce()
}

export function tickCallouts(match: MatchState): void {
  beginAnnounceFrame()
  for (const c of match.callouts) c.life -= 1
  match.callouts = match.callouts.filter((c) => c.life > 0)
}

export function pushCallout(match: MatchState, text: string): void {
  const hit = match.callouts.find((c) => c.text === text)
  if (hit) hit.life = CALLOUT_LIFE
  else {
    match.callouts.unshift({
      text,
      fill: FILL[text] ?? '#fff4c8',
      life: CALLOUT_LIFE,
      max: CALLOUT_LIFE,
    })
    if (match.callouts.length > 3) match.callouts.length = 3
  }
  speakCallout(text)
}

type PendingHit = { attacker: Fighter; victim: Fighter; reversal: boolean; swinging: boolean }

let pending: PendingHit[] = []

function swingingStatus(victim: Fighter): boolean {
  return victim.status === 'attack' || victim.status === 'special' || victim.status === 'throw'
}

function emitLandedHit(
  match: MatchState,
  attacker: Fighter,
  victim: Fighter,
  reversal: boolean,
  swinging: boolean,
  countStreak: boolean,
): void {
  if (countStreak) {
    match.streak[victim.id] = 0
    match.streak[attacker.id] += 1
  }
  if (!match.firstStrike) {
    match.firstStrike = true
    pushCallout(match, CALLOUT.first)
  }
  if (reversal) pushCallout(match, CALLOUT.reversal)
  else if (swinging) pushCallout(match, CALLOUT.counter)
  if (countStreak && match.streak[attacker.id] === EXCELLENT_HITS) pushCallout(match, CALLOUT.excellent)
}

/** Unblocked damaging hit or throw. Poison DoT does not use this. */
export function noteLandedHit(
  match: MatchState,
  attacker: Fighter,
  victim: Fighter,
  reversal = attacker.reversal,
): void {
  if (match.phase !== 'fight') return
  emitLandedHit(match, attacker, victim, reversal, swingingStatus(victim), true)
}

export function queueLandedHit(
  match: MatchState,
  attacker: Fighter,
  victim: Fighter,
  reversal = attacker.reversal,
): void {
  if (match.phase !== 'fight') return
  pending.push({ attacker, victim, reversal, swinging: swingingStatus(victim) })
}

/** Apply queued strike/projectile hits together so a trade cannot award EXCELLENT. */
export function flushLandedHits(match: MatchState): void {
  const hits = pending
  pending = []
  if (hits.length === 0) return
  const traded = hits.some((h) => h.attacker.id !== hits[0].attacker.id)
  if (traded) match.streak = [0, 0]
  for (const h of hits) emitLandedHit(match, h.attacker, h.victim, h.reversal, h.swinging, !traded)
}

export function notePerfect(match: MatchState): void {
  pushCallout(match, CALLOUT.perfect)
}

export function noteDoubleKo(match: MatchState): void {
  pushCallout(match, CALLOUT.double)
}
