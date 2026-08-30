import { describe, expect, it } from 'vitest'
import { emptyInput, type VirtualInput } from '../input/virtual.ts'
import { CALLOUT, EXCELLENT_HITS, REVERSAL_WINDOW, noteLandedHit, pushCallout, tickCallouts } from './callout.ts'
import { startMove } from './fighter.ts'
import { createMatch, tickMatch } from './match.ts'
import { spawnFrom } from './projectile.ts'

function hold(prev: VirtualInput, partial: Partial<VirtualInput>): VirtualInput {
  const next = emptyInput()
  Object.assign(next, {
    dir: partial.dir ?? prev.dir,
    lp: partial.lp ?? false,
    hp: partial.hp ?? false,
    lk: partial.lk ?? false,
    hk: partial.hk ?? false,
  })
  next.lpPress = next.lp && !prev.lp
  next.hpPress = next.hp && !prev.hp
  next.lkPress = next.lk && !prev.lk
  next.hkPress = next.hk && !prev.hk
  next.punchPress = next.lpPress || next.hpPress
  next.kickPress = next.lkPress || next.hkPress
  return next
}

function skip(world: ReturnType<typeof createMatch>, n: number, dummy = false): void {
  for (let i = 0; i < n; i++) tickMatch(world, [emptyInput(), emptyInput()], dummy)
}

function texts(world: ReturnType<typeof createMatch>): string[] {
  return world.match.callouts.map((c) => c.text)
}

function jab(world: ReturnType<typeof createMatch>, dummy = false): void {
  world.fighters[1].x = world.fighters[0].x + 28
  tickMatch(world, [hold(emptyInput(), { lp: true }), emptyInput()], dummy)
  skip(world, 12, dummy)
}

function withSpeech(run: (spoken: string[]) => void): void {
  const spoken: string[] = []
  const g = globalThis as {
    window?: unknown
    SpeechSynthesisUtterance?: unknown
  }
  const prevWindow = g.window
  const prevUtter = g.SpeechSynthesisUtterance
  class FakeUtterance {
    text: string
    lang = ''
    rate = 1
    pitch = 1
    volume = 1
    voice = null
    constructor(text: string) {
      this.text = text
    }
  }
  g.SpeechSynthesisUtterance = FakeUtterance
  g.window = {
    speechSynthesis: {
      getVoices: () => [],
      cancel() {},
      speak(u: { text: string }) {
        spoken.push(u.text)
      },
      addEventListener() {},
    },
  }
  try {
    run(spoken)
  } finally {
    if (prevWindow === undefined) delete g.window
    else g.window = prevWindow
    if (prevUtter === undefined) delete g.SpeechSynthesisUtterance
    else g.SpeechSynthesisUtterance = prevUtter
  }
}

describe('callouts', () => {
  it('FIRST STRIKE on the first unblocked hit of a round', () => {
    const world = createMatch({ p1: 'bob', p2: 'ninja', p2Cpu: false })
    skip(world, 120)
    jab(world)
    expect(texts(world)).toContain(CALLOUT.first)
    expect(world.match.firstStrike).toBe(true)
    const n = world.match.callouts.filter((c) => c.text === CALLOUT.first).length
    jab(world)
    expect(world.match.callouts.filter((c) => c.text === CALLOUT.first).length).toBe(n)
  })

  it('blocked hits do not first-strike', () => {
    const world = createMatch({ p1: 'bob', p2: 'ninja', p2Cpu: false })
    skip(world, 120)
    jab(world, true)
    expect(world.fighters[1].hp).toBe(1000)
    expect(texts(world)).not.toContain(CALLOUT.first)
    expect(world.match.firstStrike).toBe(false)
  })

  it('a same-frame trade resets both streaks and does not award EXCELLENT', () => {
    const world = createMatch({ p1: 'bob', p2: 'bob', p2Cpu: false })
    skip(world, 120)
    world.match.streak = [3, 3]
    world.fighters[0].x = 300
    world.fighters[1].x = 328
    const jabIn = hold(emptyInput(), { lp: true })
    tickMatch(world, [jabIn, jabIn], false)
    skip(world, 12)
    expect(texts(world)).not.toContain(CALLOUT.excellent)
    expect(world.match.streak).toEqual([0, 0])
  })

  it('COUNTER when a hit lands during the opponent attack', () => {
    const world = createMatch({ p1: 'bob', p2: 'bob', p2Cpu: false })
    skip(world, 120)
    world.fighters[0].x = 300
    world.fighters[1].x = 328
    const jabIn = hold(emptyInput(), { lp: true })
    tickMatch(world, [jabIn, jabIn], false)
    skip(world, 12)
    expect(texts(world)).toContain(CALLOUT.counter)
    expect(texts(world)).toContain(CALLOUT.first)
  })

  it('EXCELLENT after four unanswered hits', () => {
    const world = createMatch({ p1: 'bob', p2: 'ninja', p2Cpu: false })
    skip(world, 120)
    const [a, b] = world.fighters
    for (let i = 0; i < EXCELLENT_HITS - 1; i++) noteLandedHit(world.match, a, b)
    expect(texts(world)).not.toContain(CALLOUT.excellent)
    noteLandedHit(world.match, a, b)
    expect(texts(world)).toContain(CALLOUT.excellent)
    expect(world.match.streak[0]).toBe(EXCELLENT_HITS)
  })

  it('taking a hit resets the unanswered streak', () => {
    const world = createMatch({ p1: 'bob', p2: 'ninja', p2Cpu: false })
    skip(world, 120)
    const [a, b] = world.fighters
    noteLandedHit(world.match, a, b)
    noteLandedHit(world.match, a, b)
    noteLandedHit(world.match, b, a)
    expect(world.match.streak[0]).toBe(0)
    expect(world.match.streak[1]).toBe(1)
    expect(texts(world)).not.toContain(CALLOUT.excellent)
  })

  it('REVERSAL when a move started in the wakeup window connects', () => {
    const world = createMatch({ p1: 'bob', p2: 'ninja', p2Cpu: false })
    skip(world, 120)
    world.fighters[0].reversalLeft = 8
    startMove(world.fighters[0], 'standLP')
    expect(world.fighters[0].reversal).toBe(true)
    noteLandedHit(world.match, world.fighters[0], world.fighters[1])
    expect(texts(world)).toContain(CALLOUT.reversal)
  })

  it('keeps the reversal window for REVERSAL_WINDOW actionable ticks', () => {
    const world = createMatch({ p1: 'bob', p2: 'ninja', p2Cpu: false })
    skip(world, 120)
    world.fighters[0].reversalLeft = REVERSAL_WINDOW
    skip(world, REVERSAL_WINDOW - 1)
    startMove(world.fighters[0], 'standLP')
    expect(world.fighters[0].reversal).toBe(true)
    const late = createMatch({ p1: 'bob', p2: 'ninja', p2Cpu: false })
    skip(late, 120)
    late.fighters[0].reversalLeft = REVERSAL_WINDOW
    skip(late, REVERSAL_WINDOW)
    startMove(late.fighters[0], 'standLP')
    expect(late.fighters[0].reversal).toBe(false)
  })

  it('PERFECT when you KO with full health', () => {
    const world = createMatch({ p1: 'bob', p2: 'ninja', p2Cpu: false })
    skip(world, 120)
    world.fighters[1].hp = 0
    tickMatch(world, [emptyInput(), emptyInput()], false)
    expect(world.match.phase).toBe('ko')
    expect(texts(world)).toContain(CALLOUT.perfect)
  })

  it('DOUBLE K.O. when both fighters fall', () => {
    const world = createMatch({ p1: 'bob', p2: 'ninja', p2Cpu: false })
    skip(world, 120)
    world.fighters[0].hp = 0
    world.fighters[1].hp = 0
    tickMatch(world, [emptyInput(), emptyInput()], false)
    expect(texts(world)).toContain(CALLOUT.double)
  })

  it('projectile reversal uses the spawn flag after the owner starts a new move', () => {
    const world = createMatch({ p1: 'ninja', p2: 'bob', p2Cpu: false })
    skip(world, 120)
    const [ninja, bob] = world.fighters
    ninja.reversal = true
    const star = spawnFrom(ninja, 'shuriken', false)
    expect(star.reversal).toBe(true)
    ninja.reversal = false
    star.x = bob.x
    star.y = bob.y - 40
    world.match.projectiles.push(star)
    tickMatch(world, [emptyInput(), emptyInput()], false)
    expect(texts(world)).toContain(CALLOUT.reversal)
  })

  it('a throw answered by a same-frame projectile does not award EXCELLENT', () => {
    const world = createMatch({ p1: 'bob', p2: 'ninja', p2Cpu: false })
    skip(world, 120)
    world.match.streak = [3, 0]
    world.fighters[1].x = world.fighters[0].x + 24
    const star = spawnFrom(world.fighters[1], 'shuriken', false)
    star.x = world.fighters[0].x
    star.y = world.fighters[0].y - 40
    world.match.projectiles.push(star)
    tickMatch(world, [hold(emptyInput(), { lp: true, lk: true }), emptyInput()], false)
    expect(texts(world)).not.toContain(CALLOUT.excellent)
    expect(world.match.streak).toEqual([0, 0])
  })

  it('a late non-reversal projectile does not inherit a later reversal move', () => {
    const world = createMatch({ p1: 'ninja', p2: 'bob', p2Cpu: false })
    skip(world, 120)
    const [ninja, bob] = world.fighters
    ninja.reversal = false
    const star = spawnFrom(ninja, 'shuriken', false)
    ninja.reversal = true
    star.x = bob.x
    star.y = bob.y - 40
    world.match.projectiles.push(star)
    tickMatch(world, [emptyInput(), emptyInput()], false)
    expect(texts(world)).not.toContain(CALLOUT.reversal)
  })

  it('speaks again when a live callout is refreshed', () => {
    withSpeech((spoken) => {
      const world = createMatch({ p1: 'bob', p2: 'ninja', p2Cpu: false })
      skip(world, 120)
      pushCallout(world.match, CALLOUT.counter)
      pushCallout(world.match, CALLOUT.counter)
      expect(spoken.filter((t) => t === 'Counter!')).toHaveLength(2)
    })
  })

  it('keeps a same-frame COUNTER quiet under FIRST STRIKE', () => {
    withSpeech((spoken) => {
      const world = createMatch({ p1: 'bob', p2: 'ninja', p2Cpu: false })
      skip(world, 120)
      world.fighters[1].status = 'attack'
      noteLandedHit(world.match, world.fighters[0], world.fighters[1])
      expect(spoken).toContain('First strike!')
      expect(spoken).not.toContain('Counter!')
    })
  })

  it('lets COUNTER speak on a later simulation frame', () => {
    withSpeech((spoken) => {
      const world = createMatch({ p1: 'bob', p2: 'ninja', p2Cpu: false })
      skip(world, 120)
      pushCallout(world.match, CALLOUT.first)
      tickCallouts(world.match)
      pushCallout(world.match, CALLOUT.counter)
      expect(spoken).toEqual(['First strike!', 'Counter!'])
    })
  })

  it('new round clears first strike and streak', () => {
    const world = createMatch({ p1: 'bob', p2: 'ninja', p2Cpu: false })
    skip(world, 120)
    world.fighters[0].hp = 0
    world.fighters[1].hp = 0
    tickMatch(world, [emptyInput(), emptyInput()], false)
    skip(world, 170)
    expect(world.match.round).toBe(2)
    expect(world.match.firstStrike).toBe(false)
    expect(world.match.streak).toEqual([0, 0])
    expect(world.match.callouts).toEqual([])
  })
})
