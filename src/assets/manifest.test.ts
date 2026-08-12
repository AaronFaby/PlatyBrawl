import { describe, expect, it } from 'vitest'
import { poseForAnim } from './manifest.ts'

describe('pose mapping', () => {
  it('keeps idle on the idle sprite so both fighters do not step in sync', () => {
    expect(poseForAnim('idle', 0)).toBe('idle')
    expect(poseForAnim('idle', 1)).toBe('idle')
  })

  it('only swaps walk poses while walking', () => {
    expect(poseForAnim('walk', 0)).toBe('walk')
    expect(poseForAnim('walk', 1)).toBe('idle')
  })
})
