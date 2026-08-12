import { expect, it } from 'vitest'
import { isMuted, setMuted } from './engine.ts'

it('works when browser storage is unavailable', () => {
  expect(isMuted()).toBe(false)
  expect(() => setMuted(true)).not.toThrow()
})
