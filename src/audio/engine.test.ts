import { expect, it } from 'vitest'
import { isMuted, isSfxMuted, setMuted, setSfxMuted, toggleSfxMute } from './engine.ts'

it('works when browser storage is unavailable', () => {
  expect(isMuted()).toBe(false)
  expect(() => setMuted(true)).not.toThrow()
})

it('toggles SFX mute independently of music', () => {
  const music = isMuted()
  expect(() => setSfxMuted(true)).not.toThrow()
  expect(isSfxMuted()).toBe(true)
  expect(isMuted()).toBe(music)
  expect(toggleSfxMute()).toBe(false)
  expect(isSfxMuted()).toBe(false)
})
