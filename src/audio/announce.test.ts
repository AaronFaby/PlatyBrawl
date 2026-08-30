import { expect, it } from 'vitest'
import { beginAnnounceFrame, cancelAnnounce, speakCallout, unlockAnnounce } from './announce.ts'

it('announcer helpers no-op without speechSynthesis', () => {
  expect(() => unlockAnnounce()).not.toThrow()
  expect(() => beginAnnounceFrame()).not.toThrow()
  expect(() => speakCallout('FIRST STRIKE!')).not.toThrow()
  expect(() => speakCallout('COUNTER!')).not.toThrow()
  expect(() => cancelAnnounce()).not.toThrow()
})
