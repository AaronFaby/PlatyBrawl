import { expect, it } from 'vitest'
import {
  beginAnnounceFrame,
  cancelAnnounce,
  speakCallout,
  spokenCallouts,
  unlockAnnounce,
} from './announce.ts'

it('announcer helpers no-op without Web Audio', () => {
  expect(() => unlockAnnounce()).not.toThrow()
  expect(() => beginAnnounceFrame()).not.toThrow()
  expect(() => speakCallout('FIRST STRIKE!')).not.toThrow()
  expect(() => speakCallout('COUNTER!')).not.toThrow()
  expect(() => cancelAnnounce()).not.toThrow()
})

it('records the higher-priority line in a frame and drops the rest', () => {
  cancelAnnounce()
  beginAnnounceFrame()
  speakCallout('COUNTER!')
  speakCallout('FIRST STRIKE!')
  speakCallout('EXCELLENT')
  expect(spokenCallouts()).toEqual(['Counter!', 'First strike!'])
})
