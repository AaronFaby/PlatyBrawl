import { expect, it, vi } from 'vitest'
import {
  armTitleAttract,
  beginAnnounceFrame,
  cancelAnnounce,
  cancelTitleAttract,
  speakCallout,
  speakTitle,
  spokenCallouts,
  unlockAnnounce,
} from './announce.ts'

it('announcer helpers no-op without Web Audio', () => {
  expect(() => unlockAnnounce()).not.toThrow()
  expect(() => beginAnnounceFrame()).not.toThrow()
  expect(() => speakCallout('FIRST STRIKE!')).not.toThrow()
  expect(() => speakCallout('COUNTER!')).not.toThrow()
  expect(() => speakCallout('ROUND 1')).not.toThrow()
  expect(() => speakCallout('FIGHT')).not.toThrow()
  expect(() => speakTitle()).not.toThrow()
  expect(() => cancelAnnounce()).not.toThrow()
})

it('records the title attract line once per arm', () => {
  cancelAnnounce()
  armTitleAttract()
  speakTitle()
  speakTitle()
  expect(spokenCallouts()).toEqual(['Platy Brawl!'])
})

it('drops a pending title shout when attract is cancelled', () => {
  cancelAnnounce()
  armTitleAttract()
  cancelTitleAttract()
  speakTitle()
  expect(spokenCallouts()).toEqual([])
})

it('records the higher-priority line in a frame and drops the rest', () => {
  cancelAnnounce()
  beginAnnounceFrame()
  speakCallout('COUNTER!')
  speakCallout('FIRST STRIKE!')
  speakCallout('EXCELLENT')
  expect(spokenCallouts()).toEqual(['Counter!', 'First strike!'])
})

it('records round banners and extra-round fallback copy', () => {
  cancelAnnounce()
  beginAnnounceFrame()
  speakCallout('ROUND 1')
  expect(spokenCallouts()).toEqual(['Round 1!'])
  beginAnnounceFrame()
  speakCallout('FIGHT')
  expect(spokenCallouts()).toEqual(['Round 1!', 'Fight!'])
  beginAnnounceFrame()
  speakCallout('ROUND 4')
  expect(spokenCallouts()).toContain('Round 4!')
})

it('lets PERFECT and DOUBLE K.O. replace K.O. in the same frame', () => {
  cancelAnnounce()
  beginAnnounceFrame()
  speakCallout('K.O.')
  speakCallout('PERFECT')
  expect(spokenCallouts()).toEqual(['K.O.!', 'Perfect!'])
  cancelAnnounce()
  beginAnnounceFrame()
  speakCallout('K.O.')
  speakCallout('DOUBLE K.O.')
  expect(spokenCallouts()).toEqual(['K.O.!', 'Double K.O.!'])
  beginAnnounceFrame()
  speakCallout('K.O.')
  speakCallout('EXCELLENT')
  expect(spokenCallouts()).not.toContain('Excellent!')
})

it('plays a title shout queued while clips load', async () => {
  let starts = 0
  const param = {
    value: 1,
    cancelScheduledValues() {},
    setValueAtTime() {},
    linearRampToValueAtTime() {},
  }
  class FakeAudioContext {
    state = 'running'
    currentTime = 0
    destination = {}
    createGain() {
      return { gain: { ...param }, connect() {} }
    }
    createBufferSource() {
      return { buffer: null, connect() {}, start: () => starts++, stop() {}, onended: null }
    }
    async decodeAudioData() {
      return { duration: 0.5 }
    }
  }
  vi.stubGlobal('window', {})
  vi.stubGlobal('document', {})
  vi.stubGlobal('AudioContext', FakeAudioContext)
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(1) })))

  cancelAnnounce()
  armTitleAttract()
  unlockAnnounce()
  speakTitle()

  await vi.waitFor(() => expect(starts).toBe(1))
  vi.unstubAllGlobals()
})
