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

  it('maps soldier specials to the pistol and rush poses', () => {
    expect(poseForAnim('pistolShotL', 1)).toBe('special1')
    expect(poseForAnim('pistolShotH', 0)).toBe('special1')
    expect(poseForAnim('combatRushL', 1)).toBe('special2')
    expect(poseForAnim('standLP', 1)).toBe('punch')
    expect(poseForAnim('standHK', 1)).toBe('kick')
  })
})
