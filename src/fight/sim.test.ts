import { describe, expect, it } from 'vitest'
import { cancelAnnounce, spokenCallouts } from '../audio/announce.ts'
import { STAGE_IDS } from '../data/stages.ts'
import { currentFrame, resetFighter } from './fighter.ts'
import { THROW_COOLDOWN } from '../config.ts'
import { emptyInput, type VirtualInput } from '../input/virtual.ts'
import { createMatch, tickMatch } from './match.ts'

function tap(partial: Partial<VirtualInput>): VirtualInput {
  const i = emptyInput()
  Object.assign(i, partial)
  return i
}

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

function skip(world: ReturnType<typeof createMatch>, n: number, p1 = emptyInput(), p2 = emptyInput()): void {
  for (let i = 0; i < n; i++) tickMatch(world, [p1, p2], false)
}

describe('review regressions', () => {
  it.each([0, 1] as const)('limits player %i throws to once every 120 simulation frames', (attackerId) => {
    const world = createMatch({ p1: 'bob', p2: 'bob', p2Cpu: false })
    skip(world, 120)
    const victimId = attackerId === 0 ? 1 : 0
    world.fighters[0].x = attackerId === 0 ? 650 : 36
    world.fighters[1].x = attackerId === 0 ? 684 : 70
    const attacker = world.fighters[attackerId]
    const victim = world.fighters[victimId]
    const inputs: [VirtualInput, VirtualInput] = [emptyInput(), emptyInput()]
    inputs[attackerId] = hold(emptyInput(), { lp: true, lk: true })
    tickMatch(world, inputs, false)
    expect(attacker.throwCooldown).toBe(THROW_COOLDOWN)
    expect(victim.throwCooldown).toBe(0)
    expect(victim.hp).toBe(920)
    inputs[attackerId] = hold(inputs[attackerId], { lp: true, lk: true })
    for (let i = 0; i < 119; i++) {
      tickMatch(world, inputs, false)
      expect(victim.hp).toBe(920)
    }
    expect(attacker.throwCooldown).toBe(1)
    tickMatch(world, inputs, false)
    expect(victim.hp).toBe(840)
    expect(attacker.throwCooldown).toBe(THROW_COOLDOWN)
    resetFighter(attacker, 220, 1)
    expect(attacker.throwCooldown).toBe(0)
  })

  it('does not start the throw cooldown on a missed attempt or prevent walking', () => {
    const world = createMatch({ p1: 'bob', p2: 'bob', p2Cpu: false })
    skip(world, 120)
    const x = world.fighters[0].x
    tickMatch(world, [hold(emptyInput(), { lp: true, lk: true, dir: 6 }), emptyInput()], false)
    expect(world.fighters[0].throwCooldown).toBe(0)
    expect(world.fighters[0].x).toBeGreaterThan(x)
    expect(world.fighters[1].hp).toBe(1000)
  })

  it.each([0, 1] as const)('lets player %i jump out of repeated corner throws after wakeup', (victimId) => {
    const world = createMatch({ p1: 'bob', p2: 'bob', p2Cpu: false })
    skip(world, 120)
    const attackerId = victimId === 0 ? 1 : 0
    const victim = world.fighters[victimId]
    world.fighters[0].x = victimId === 0 ? 36 : 650
    world.fighters[1].x = victimId === 0 ? 70 : 684
    const inputs: [VirtualInput, VirtualInput] = [emptyInput(), emptyInput()]
    inputs[attackerId] = hold(emptyInput(), { lp: true, lk: true })
    tickMatch(world, inputs, false)
    expect(victim.hp).toBe(920)
    inputs[attackerId] = hold(inputs[attackerId], { lp: true, lk: true })
    inputs[victimId] = tap({ dir: 8 })
    const states = new Set([victim.status])
    for (let i = 0; i < 80 && victim.status !== 'jump'; i++) {
      tickMatch(world, inputs, false)
      states.add(victim.status)
    }
    expect(states).toContain('knockdown')
    expect(states).toContain('wakeup')
    expect(victim.status).toBe('jump')
    expect(victim.hp).toBe(920)
    expect(victim.pendingKd).toBe(false)
    expect(victim.stun).toBe(0)
  })

  it.each([0, 1] as const)('locks player %i throws when the timer expires', (attackerId) => {
    const world = createMatch({ p1: 'bob', p2: 'bob', p2Cpu: false })
    skip(world, 120)
    const winner = attackerId === 0 ? 1 : 0
    world.fighters[0].x = 300
    world.fighters[1].x = 370
    world.fighters[attackerId].hp = 60
    world.fighters[winner].hp = 70
    world.match.timer = 1
    world.match.timerAcc = 59
    const inputs: [VirtualInput, VirtualInput] = [emptyInput(), emptyInput()]
    inputs[attackerId] = hold(emptyInput(), { lp: true, lk: true })
    tickMatch(world, inputs, false)
    expect(world.match.phase).toBe('timeout')
    expect(world.match.winner).toBe(winner)
    expect(world.fighters[winner].hp).toBe(70)
    expect(world.fighters[attackerId].status).not.toBe('throw')
    skip(world, 51)
    expect(world.match.wins[winner]).toBe(1)
    expect(world.fighters[winner].status).toBe('win')
  })

  it.each(['L', 'H'])('keeps Rocket Knee %s moving through its active frames', (strength) => {
    const world = createMatch({ p1: 'cyber', p2: 'bob', p2Cpu: false })
    skip(world, 120)
    let input = emptyInput()
    for (const dir of [2, 3, 6]) {
      input = hold(input, { dir, lk: dir === 6 && strength === 'L', hk: dir === 6 && strength === 'H' })
      tickMatch(world, [input, emptyInput()], false)
    }
    const cyber = world.fighters[0]
    expect(cyber.moveId).toBe(`rocketKnee${strength}`)
    const x = cyber.x
    let activeTicks = 0
    for (let i = 0; i < 45; i++) {
      tickMatch(world, [emptyInput(), emptyInput()], false)
      if (currentFrame(cyber).hit && cyber.frameTicks > 0) {
        expect(cyber.vx).toBeGreaterThan(3)
        activeTicks += 1
      }
    }
    expect(activeTicks).toBeGreaterThan(8)
    expect(cyber.x - x).toBeGreaterThan(80)
  })
})

describe('match sim', () => {
  it('neither fighter walks during intro or the first idle second', () => {
    const world = createMatch({ p1: 'bob', p2: 'ninja', p2Cpu: false })
    const x1 = world.fighters[0].x
    const x2 = world.fighters[1].x
    skip(world, 110)
    expect(world.match.phase).toBe('fight')
    skip(world, 60)
    expect(world.fighters[0].x).toBe(x1)
    expect(world.fighters[1].x).toBe(x2)
    expect(world.fighters[0].status).toBe('idle')
    expect(world.fighters[1].status).toBe('idle')
  })

  it('P2 walk does not move P1', () => {
    const world = createMatch({ p1: 'bob', p2: 'ninja', p2Cpu: false })
    skip(world, 120)
    const x1 = world.fighters[0].x
    const x2 = world.fighters[1].x
    let p2 = tap({ dir: 4 })
    for (let i = 0; i < 20; i++) {
      p2 = hold(p2, { dir: 4 })
      tickMatch(world, [emptyInput(), p2], false)
    }
    expect(world.fighters[1].x).toBeLessThan(x2 - 10)
    expect(world.fighters[0].x).toBeCloseTo(x1, 0)
    expect(world.fighters[0].status).toBe('idle')
  })

  it('P1 walk does not move P2', () => {
    const world = createMatch({ p1: 'bob', p2: 'ninja', p2Cpu: false })
    skip(world, 120)
    const x1 = world.fighters[0].x
    const x2 = world.fighters[1].x
    let p1 = tap({ dir: 6 })
    for (let i = 0; i < 20; i++) {
      p1 = hold(p1, { dir: 6 })
      tickMatch(world, [p1, emptyInput()], false)
    }
    expect(world.fighters[0].x).toBeGreaterThan(x1 + 10)
    expect(world.fighters[1].x).toBeCloseTo(x2, 0)
  })

  it('intro becomes fight and a jab can deal damage', () => {
    const world = createMatch({ p1: 'bob', p2: 'bob', p2Cpu: true })
    skip(world, 120)
    expect(world.match.phase).toBe('fight')
    world.fighters[1].x = world.fighters[0].x + 28
    let p1 = emptyInput()
    p1 = hold(p1, { lp: true, lpPress: true, punchPress: true })
    tickMatch(world, [p1, emptyInput()], false)
    skip(world, 20)
    expect(world.fighters[1].hp).toBeLessThan(1000)
  })

  it('allows simultaneous strikes to trade', () => {
    const world = createMatch({ p1: 'bob', p2: 'bob', p2Cpu: false })
    skip(world, 120)
    world.fighters[0].x = 300
    world.fighters[1].x = 328
    const jab = hold(emptyInput(), { lp: true })
    tickMatch(world, [jab, jab], false)
    skip(world, 10)
    expect(world.fighters[0].hp).toBe(960)
    expect(world.fighters[1].hp).toBe(960)
  })

  it('copies session color skins onto fighters', () => {
    const world = createMatch({ p1: 'bob', p2: 'ninja', p2Cpu: false, p1Skin: 2, p2Skin: 3 })
    expect(world.fighters[0].skin).toBe(2)
    expect(world.fighters[1].skin).toBe(3)
  })

  it('Bob QCF+P starts Bill Drill', () => {
    const world = createMatch({ p1: 'bob', p2: 'ninja', p2Cpu: true })
    skip(world, 120)
    let p1 = emptyInput()
    p1 = hold(p1, { dir: 2 })
    tickMatch(world, [p1, emptyInput()], false)
    p1 = hold(p1, { dir: 3 })
    tickMatch(world, [p1, emptyInput()], false)
    p1 = hold(p1, { dir: 6, lp: true })
    p1.lpPress = true
    p1.punchPress = true
    tickMatch(world, [p1, emptyInput()], false)
    expect(world.fighters[0].moveId === 'billDrillL' || world.fighters[0].status === 'special').toBe(true)
  })

  it('Bob QCF+K starts Venom Spur', () => {
    const world = createMatch({ p1: 'bob', p2: 'ninja', p2Cpu: true })
    skip(world, 120)
    let p1 = emptyInput()
    p1 = hold(p1, { dir: 2 })
    tickMatch(world, [p1, emptyInput()], false)
    p1 = hold(p1, { dir: 3 })
    tickMatch(world, [p1, emptyInput()], false)
    p1 = hold(p1, { dir: 6, lk: true })
    p1.lkPress = true
    p1.kickPress = true
    tickMatch(world, [p1, emptyInput()], false)
    expect(world.fighters[0].moveId).toBe('venomSpurL')
  })

  it('Bob DP+P no longer starts Venom Spur', () => {
    const world = createMatch({ p1: 'bob', p2: 'ninja', p2Cpu: true })
    skip(world, 120)
    let p1 = emptyInput()
    p1 = hold(p1, { dir: 6 })
    tickMatch(world, [p1, emptyInput()], false)
    p1 = hold(p1, { dir: 2 })
    tickMatch(world, [p1, emptyInput()], false)
    p1 = hold(p1, { dir: 3, lp: true })
    p1.lpPress = true
    p1.punchPress = true
    tickMatch(world, [p1, emptyInput()], false)
    expect(world.fighters[0].moveId).not.toBe('venomSpurL')
    expect(world.fighters[0].moveId).not.toBe('venomSpurH')
  })

  it('Ninja QCF+P spawns a shuriken', () => {
    const world = createMatch({ p1: 'ninja', p2: 'bob', p2Cpu: true })
    skip(world, 120)
    let p1 = emptyInput()
    for (const dir of [2, 3, 6]) {
      p1 = hold(p1, { dir, lp: dir === 6, lpPress: dir === 6, punchPress: dir === 6 })
      tickMatch(world, [p1, emptyInput()], false)
    }
    skip(world, 16)
    expect(world.match.projectiles.some((p) => p.kind === 'shuriken')).toBe(true)
  })

  it('Soldier QCF+P fires a pistol bullet', () => {
    const world = createMatch({ p1: 'soldier', p2: 'bob', p2Cpu: true })
    skip(world, 120)
    let p1 = emptyInput()
    for (const dir of [2, 3, 6]) {
      p1 = hold(p1, { dir, lp: dir === 6, lpPress: dir === 6, punchPress: dir === 6 })
      tickMatch(world, [p1, emptyInput()], false)
    }
    skip(world, 16)
    expect(world.match.projectiles.some((p) => p.kind === 'bullet')).toBe(true)
  })

  it('Cyber charge then forward+P fires a beam', () => {
    const world = createMatch({ p1: 'cyber', p2: 'bob', p2Cpu: true })
    skip(world, 120)
    let p1 = tap({ dir: 4 })
    for (let i = 0; i < 42; i++) {
      p1 = hold(p1, { dir: 4 })
      tickMatch(world, [p1, emptyInput()], false)
    }
    p1 = hold(p1, { dir: 6, hp: true })
    p1.hpPress = true
    p1.punchPress = true
    tickMatch(world, [p1, emptyInput()], false)
    skip(world, 20)
    expect(world.fighters[0].moveId?.startsWith('plasma') || world.match.projectiles.some((p) => p.kind === 'beam')).toBe(
      true,
    )
  })

  it('Chainsaw QCF+P throws a chain that drags the opponent all the way in', () => {
    const world = createMatch({ p1: 'chainsaw', p2: 'bob', p2Cpu: false })
    skip(world, 120)
    world.fighters[1].x = world.fighters[0].x + 160
    let p1 = emptyInput()
    for (const dir of [2, 3, 6]) {
      p1 = hold(p1, { dir, lp: dir === 6, lpPress: dir === 6, punchPress: dir === 6 })
      tickMatch(world, [p1, emptyInput()], false)
    }
    skip(world, 16)
    expect(world.match.projectiles.some((p) => p.kind === 'chain')).toBe(true)
    let hitX = world.fighters[1].x
    for (let i = 0; i < 50 && world.fighters[1].hp === 1000; i++) {
      tickMatch(world, [emptyInput(), emptyInput()], false)
      hitX = world.fighters[1].x
    }
    expect(world.fighters[1].hp).toBeLessThan(1000)
    expect(hitX).toBeGreaterThan(world.fighters[0].x + 100)
    const mid = world.fighters[1].x
    skip(world, 8)
    expect(world.fighters[1].x).toBeLessThan(mid - 20)
    skip(world, 30)
    expect(world.fighters[1].x - world.fighters[0].x).toBeLessThan(50)
    expect(world.fighters[1].x).toBeGreaterThan(world.fighters[0].x + 16)
  })

  it('Chainsaw QCF+K starts Saw Slash', () => {
    const world = createMatch({ p1: 'chainsaw', p2: 'bob', p2Cpu: true })
    skip(world, 120)
    let p1 = emptyInput()
    for (const dir of [2, 3, 6]) {
      p1 = hold(p1, { dir, lk: dir === 6, lkPress: dir === 6, kickPress: dir === 6 })
      tickMatch(world, [p1, emptyInput()], false)
    }
    expect(world.fighters[0].moveId === 'sawSlashL' || world.fighters[0].status === 'special').toBe(true)
  })

  it('Toxic QCF+P throws a gas bomb that poisons on hit', () => {
    const world = createMatch({ p1: 'toxic', p2: 'bob', p2Cpu: false })
    skip(world, 120)
    world.fighters[1].x = world.fighters[0].x + 90
    let p1 = emptyInput()
    for (const dir of [2, 3, 6]) {
      p1 = hold(p1, { dir, lp: dir === 6, lpPress: dir === 6, punchPress: dir === 6 })
      tickMatch(world, [p1, emptyInput()], false)
    }
    skip(world, 16)
    expect(world.match.projectiles.some((p) => p.kind === 'gas')).toBe(true)
    for (let i = 0; i < 50 && world.fighters[1].hp === 1000; i++) {
      tickMatch(world, [emptyInput(), emptyInput()], false)
    }
    expect(world.fighters[1].hp).toBeLessThan(1000)
    expect(world.fighters[1].poisonLeft).toBeGreaterThan(0)
    const afterHit = world.fighters[1].hp
    skip(world, 65)
    expect(world.fighters[1].hp).toBeLessThan(afterHit)
    expect(world.fighters[1].status).not.toBe('hurt')
  })

  it('blocked gas bomb does not apply poison', () => {
    const world = createMatch({ p1: 'toxic', p2: 'bob', p2Cpu: false })
    skip(world, 120)
    world.fighters[1].x = world.fighters[0].x + 90
    let p1 = emptyInput()
    for (const dir of [2, 3, 6]) {
      p1 = hold(p1, { dir, lp: dir === 6, lpPress: dir === 6, punchPress: dir === 6 })
      tickMatch(world, [p1, emptyInput()], false)
    }
    let p2 = tap({ dir: 6 })
    for (let i = 0; i < 60; i++) {
      p2 = hold(p2, { dir: 6 })
      tickMatch(world, [emptyInput(), p2], false)
    }
    expect(world.fighters[1].poisonLeft).toBe(0)
    expect(world.fighters[1].hp).toBe(1000)
  })

  it('Toxic QCB+K Meltdown doubles the next unblocked hit', () => {
    const world = createMatch({ p1: 'toxic', p2: 'bob', p2Cpu: false })
    skip(world, 120)
    let p1 = emptyInput()
    for (const dir of [2, 1, 4]) {
      p1 = hold(p1, { dir, lk: dir === 4, lkPress: dir === 4, kickPress: dir === 4 })
      tickMatch(world, [p1, emptyInput()], false)
    }
    skip(world, 40)
    expect(world.fighters[0].radHits).toBe(1)
    expect(world.fighters[0].status).toBe('idle')
    world.fighters[1].x = world.fighters[0].x + 28
    p1 = hold(emptyInput(), { lp: true, lpPress: true, punchPress: true })
    tickMatch(world, [p1, emptyInput()], false)
    skip(world, 12)
    expect(world.fighters[1].hp).toBe(920)
    expect(world.fighters[0].radHits).toBe(0)
    skip(world, 24)
    world.fighters[1].x = world.fighters[0].x + 28
    world.fighters[1].status = 'idle'
    world.fighters[1].anim = 'idle'
    world.fighters[1].stun = 0
    p1 = hold(emptyInput(), { lp: true, lpPress: true, punchPress: true })
    tickMatch(world, [p1, emptyInput()], false)
    skip(world, 12)
    expect(world.fighters[1].hp).toBe(880)
  })

  it('blocked jab does not consume Meltdown', () => {
    const world = createMatch({ p1: 'toxic', p2: 'bob', p2Cpu: false })
    skip(world, 120)
    let p1 = emptyInput()
    for (const dir of [2, 1, 4]) {
      p1 = hold(p1, { dir, lk: dir === 4, lkPress: dir === 4, kickPress: dir === 4 })
      tickMatch(world, [p1, emptyInput()], false)
    }
    skip(world, 40)
    expect(world.fighters[0].radHits).toBe(1)
    expect(world.fighters[0].status).toBe('idle')
    world.fighters[1].x = world.fighters[0].x + 28
    p1 = hold(emptyInput(), { lp: true, lpPress: true, punchPress: true })
    let p2 = tap({ dir: 6 })
    tickMatch(world, [p1, p2], false)
    p2 = hold(p2, { dir: 6 })
    skip(world, 12, emptyInput(), p2)
    expect(world.fighters[1].hp).toBe(1000)
    expect(world.fighters[0].radHits).toBe(1)
  })

  it('round reset clears poison and Meltdown', () => {
    const world = createMatch({ p1: 'toxic', p2: 'bob', p2Cpu: false })
    skip(world, 120)
    world.fighters[1].poisonLeft = 40
    world.fighters[1].poisonDmg = 5
    world.fighters[1].poisonEvery = 12
    world.fighters[0].radHits = 1
    world.fighters[1].hp = 0
    skip(world, 180)
    expect(world.match.round).toBe(2)
    expect(world.fighters[1].poisonLeft).toBe(0)
    expect(world.fighters[0].radHits).toBe(0)
  })

  it('awards rounds and reaches match over', () => {
    const world = createMatch({ p1: 'bob', p2: 'ninja', p2Cpu: false })
    skip(world, 120)
    for (let r = 0; r < 2; r++) {
      if (world.match.phase === 'intro') skip(world, 120)
      world.fighters[1].hp = 1
      world.fighters[1].x = world.fighters[0].x + 28
      const p1 = hold(emptyInput(), { hp: true, hpPress: true, punchPress: true })
      tickMatch(world, [p1, emptyInput()], false)
      skip(world, 220)
    }
    expect(world.match.wins[0]).toBeGreaterThanOrEqual(2)
    expect(world.match.phase).toBe('over')
  })

  it('keeps a pinned stage across rounds', () => {
    const world = createMatch({ p1: 'bob', p2: 'ninja', p2Cpu: false, stageId: 'armybase' })
    expect(world.match.stageId).toBe('armybase')
    skip(world, 120)
    world.fighters[1].hp = 0
    skip(world, 180)
    expect(world.match.round).toBe(2)
    expect(world.match.stageId).toBe('armybase')
  })

  it('keeps a random stage for every round of the match', () => {
    const world = createMatch({ p1: 'bob', p2: 'ninja', p2Cpu: false, stageId: 'random' })
    expect(STAGE_IDS).toContain(world.match.stageId)
    const first = world.match.stageId
    skip(world, 120)
    world.fighters[1].hp = 0
    skip(world, 180)
    expect(world.match.round).toBe(2)
    expect(world.match.stageId).toBe(first)
  })

  it('first to two KOs ends the match', () => {
    const world = createMatch({ p1: 'bob', p2: 'bob', p2Cpu: false })
    skip(world, 120)
    world.fighters[1].hp = 1
    world.fighters[1].x = world.fighters[0].x + 26
    let p1 = hold(emptyInput(), { hp: true, hpPress: true, punchPress: true })
    tickMatch(world, [p1, emptyInput()], false)
    skip(world, 30)
    expect(world.fighters[1].hp).toBe(0)
    expect(['ko', 'timeout', 'over', 'intro', 'fight']).toContain(world.match.phase)
  })

  it('blocked hits deal no damage and last onBlockStun frames', () => {
    const world = createMatch({ p1: 'bob', p2: 'bob', p2Cpu: false })
    skip(world, 120)
    world.fighters[1].x = world.fighters[0].x + 28
    const jab = hold(emptyInput(), { lp: true })
    let p2 = tap({ dir: 6 })
    tickMatch(world, [jab, p2], false)
    p2 = hold(p2, { dir: 6 })
    skip(world, 8, emptyInput(), p2)
    expect(world.fighters[1].hp).toBe(1000)
    expect(world.fighters[1].status).toBe('block')
    expect(world.fighters[1].stun).toBeGreaterThan(0)
    skip(world, world.fighters[1].stun + 2, emptyInput(), p2)
    expect(world.fighters[1].status).not.toBe('block')
  })

  it('low attacks must be blocked crouching', () => {
    const world = createMatch({ p1: 'bob', p2: 'bob', p2Cpu: false })
    skip(world, 120)
    world.fighters[1].x = world.fighters[0].x + 28
    const sweep = hold(emptyInput(), { hk: true, dir: 2 })
    let p2 = tap({ dir: 6 })
    tickMatch(world, [sweep, p2], false)
    skip(world, 12, emptyInput(), hold(p2, { dir: 6 }))
    expect(world.fighters[1].hp).toBeLessThan(1000)

    const world2 = createMatch({ p1: 'bob', p2: 'bob', p2Cpu: false })
    skip(world2, 120)
    world2.fighters[1].x = world2.fighters[0].x + 28
    const sweep2 = hold(emptyInput(), { hk: true, dir: 2 })
    let p2c = tap({ dir: 3 })
    tickMatch(world2, [sweep2, p2c], false)
    skip(world2, 12, emptyInput(), hold(p2c, { dir: 3 }))
    expect(world2.fighters[1].hp).toBe(1000)
    expect(world2.fighters[1].status).toBe('block')
  })

  it('air attacks are unblockable', () => {
    const world = createMatch({ p1: 'bob', p2: 'bob', p2Cpu: false })
    skip(world, 120)
    world.fighters[0].y = 180
    world.fighters[0].vy = -1
    world.fighters[0].status = 'jump'
    world.fighters[0].anim = 'jump'
    world.fighters[1].x = world.fighters[0].x + 28
    const air = hold(emptyInput(), { hk: true })
    const p2 = tap({ dir: 6 })
    tickMatch(world, [air, p2], false)
    skip(world, 16, emptyInput(), hold(p2, { dir: 6 }))
    expect(world.fighters[1].hp).toBeLessThan(1000)
  })

  it('blocked heavy pushback displaces further than a blocked jab', () => {
    const jabWorld = createMatch({ p1: 'bob', p2: 'bob', p2Cpu: false })
    skip(jabWorld, 120)
    jabWorld.fighters[1].x = jabWorld.fighters[0].x + 28
    const startJ = jabWorld.fighters[1].x
    const jab = hold(emptyInput(), { lp: true })
    let p2j = tap({ dir: 6 })
    tickMatch(jabWorld, [jab, p2j], false)
    p2j = hold(p2j, { dir: 6 })
    skip(jabWorld, 20, emptyInput(), p2j)
    const jabPush = Math.abs(jabWorld.fighters[1].x - startJ)

    const hpWorld = createMatch({ p1: 'bob', p2: 'bob', p2Cpu: false })
    skip(hpWorld, 120)
    hpWorld.fighters[1].x = hpWorld.fighters[0].x + 28
    const startH = hpWorld.fighters[1].x
    const hp = hold(emptyInput(), { hp: true })
    let p2h = tap({ dir: 6 })
    tickMatch(hpWorld, [hp, p2h], false)
    p2h = hold(p2h, { dir: 6 })
    skip(hpWorld, 24, emptyInput(), p2h)
    const hpPush = Math.abs(hpWorld.fighters[1].x - startH)
    expect(hpPush).toBeGreaterThan(jabPush)
    expect(jabPush).toBeGreaterThan(0)
  })

  it('throw wins over a jab when LP then LK are pressed close', () => {
    const world = createMatch({ p1: 'bob', p2: 'ninja', p2Cpu: false })
    skip(world, 120)
    world.fighters[1].x = world.fighters[0].x + 28
    tickMatch(world, [hold(emptyInput(), { lp: true }), emptyInput()], false)
    expect(world.fighters[0].moveId).toBe('standLP')
    tickMatch(world, [hold(emptyInput(), { lp: true, lk: true }), emptyInput()], false)
    expect(world.fighters[0].status).toBe('throw')
    expect(world.fighters[1].hp).toBe(920)
  })

  it('LP+LK out of range does not start a punch', () => {
    const world = createMatch({ p1: 'bob', p2: 'ninja', p2Cpu: false })
    skip(world, 120)
    world.fighters[1].x = world.fighters[0].x + 130
    tickMatch(world, [hold(emptyInput(), { lp: true, lk: true }), emptyInput()], false)
    expect(world.fighters[0].status).toBe('idle')
    expect(world.fighters[0].moveId).toBeNull()
  })

  it('LP+LK out of range still allows walking', () => {
    const world = createMatch({ p1: 'bob', p2: 'ninja', p2Cpu: false })
    skip(world, 120)
    world.fighters[1].x = world.fighters[0].x + 130
    const x = world.fighters[0].x
    let p1 = hold(emptyInput(), { lp: true, lk: true, dir: 6 })
    tickMatch(world, [p1, emptyInput()], false)
    p1 = hold(p1, { lp: true, lk: true, dir: 6 })
    tickMatch(world, [p1, emptyInput()], false)
    expect(world.fighters[0].x).toBeGreaterThan(x)
    expect(world.fighters[0].status).not.toBe('attack')
    expect(world.fighters[0].moveId).toBeNull()
  })

  it('holding LP+LK while walking in completes a throw', () => {
    const world = createMatch({ p1: 'bob', p2: 'ninja', p2Cpu: false })
    skip(world, 120)
    world.fighters[1].x = world.fighters[0].x + 130
    let p1 = hold(emptyInput(), { lp: true, lk: true, dir: 6 })
    tickMatch(world, [p1, emptyInput()], false)
    expect(world.fighters[0].status).not.toBe('throw')
    for (let i = 0; i < 80 && world.fighters[0].status !== 'throw'; i++) {
      p1 = hold(p1, { lp: true, lk: true, dir: 6 })
      tickMatch(world, [p1, emptyInput()], false)
    }
    expect(world.fighters[0].status).toBe('throw')
    expect(world.fighters[1].hp).toBe(920)
  })

  it('throw connects at visual contact, not only pushbox range', () => {
    const world = createMatch({ p1: 'bob', p2: 'ninja', p2Cpu: false })
    skip(world, 120)
    world.fighters[1].x = world.fighters[0].x + 70
    tickMatch(world, [hold(emptyInput(), { lp: true, lk: true }), emptyInput()], false)
    expect(world.fighters[0].status).toBe('throw')
    expect(world.fighters[1].hp).toBe(920)
  })

  it('throw requires LP+LK in range on the ground', () => {
    const miss = createMatch({ p1: 'bob', p2: 'ninja', p2Cpu: false })
    skip(miss, 120)
    miss.fighters[1].x = miss.fighters[0].x + 130
    tickMatch(miss, [hold(emptyInput(), { lp: true, lk: true }), emptyInput()], false)
    expect(miss.fighters[0].status).not.toBe('throw')
    expect(miss.fighters[1].hp).toBe(1000)

    const world = createMatch({ p1: 'bob', p2: 'ninja', p2Cpu: false })
    skip(world, 120)
    world.fighters[1].x = world.fighters[0].x + 24
    tickMatch(world, [hold(emptyInput(), { lp: true, lk: true }), emptyInput()], false)
    expect(world.fighters[0].status).toBe('throw')
    expect(world.fighters[1].hp).toBe(920)
  })

  it('refuses a throw against knockdown or an airborne foe', () => {
    const world = createMatch({ p1: 'bob', p2: 'ninja', p2Cpu: false })
    skip(world, 120)
    world.fighters[1].x = world.fighters[0].x + 24
    world.fighters[1].status = 'knockdown'
    tickMatch(world, [hold(emptyInput(), { lp: true, lk: true }), emptyInput()], false)
    expect(world.fighters[0].status).not.toBe('throw')

    world.fighters[1].status = 'idle'
    world.fighters[1].y = 180
    world.fighters[1].vy = -2
    tickMatch(world, [hold(emptyInput(), { lp: true, lk: true }), emptyInput()], false)
    expect(world.fighters[0].status).not.toBe('throw')
  })

  it('Meltdown doubles throw damage and is consumed', () => {
    const world = createMatch({ p1: 'toxic', p2: 'bob', p2Cpu: false })
    skip(world, 120)
    world.fighters[0].radHits = 1
    world.fighters[1].x = world.fighters[0].x + 24
    tickMatch(world, [hold(emptyInput(), { lp: true, lk: true }), emptyInput()], false)
    expect(world.fighters[1].hp).toBe(840)
    expect(world.fighters[0].radHits).toBe(0)
  })

  it('knockdown goes through wakeup invuln', () => {
    const world = createMatch({ p1: 'bob', p2: 'bob', p2Cpu: false })
    skip(world, 120)
    world.fighters[1].x = world.fighters[0].x + 28
    const sweep = hold(emptyInput(), { hk: true, dir: 2 })
    tickMatch(world, [sweep, emptyInput()], false)
    for (let i = 0; i < 120 && world.fighters[1].status !== 'knockdown'; i++) {
      tickMatch(world, [emptyInput(), emptyInput()], false)
    }
    expect(world.fighters[1].status).toBe('knockdown')
    for (let i = 0; i < 40 && world.fighters[1].status !== 'wakeup'; i++) {
      tickMatch(world, [emptyInput(), emptyInput()], false)
    }
    expect(world.fighters[1].status).toBe('wakeup')
    expect(world.fighters[1].wakeupInvuln).toBeGreaterThan(0)
    const hp = world.fighters[1].hp
    world.fighters[1].x = world.fighters[0].x + 28
    tickMatch(world, [hold(emptyInput(), { lp: true }), emptyInput()], false)
    skip(world, 8)
    expect(world.fighters[1].hp).toBe(hp)
  })

  it('timeout awards the higher HP fighter and draws on equal HP', () => {
    const win = createMatch({ p1: 'bob', p2: 'ninja', p2Cpu: false })
    skip(win, 120)
    win.fighters[1].hp = 400
    win.match.timer = 0
    tickMatch(win, [emptyInput(), emptyInput()], false)
    expect(win.match.phase).toBe('timeout')
    expect(win.match.winner).toBe(0)

    const draw = createMatch({ p1: 'bob', p2: 'ninja', p2Cpu: false })
    skip(draw, 120)
    draw.match.timer = 0
    tickMatch(draw, [emptyInput(), emptyInput()], false)
    expect(draw.match.phase).toBe('timeout')
    expect(draw.match.winner).toBeNull()
  })

  it('double KO is a draw round and startRound clears winner', () => {
    const world = createMatch({ p1: 'bob', p2: 'ninja', p2Cpu: false })
    skip(world, 120)
    world.fighters[0].hp = 0
    world.fighters[1].hp = 0
    tickMatch(world, [emptyInput(), emptyInput()], false)
    expect(world.match.phase).toBe('ko')
    expect(world.match.winner).toBeNull()
    skip(world, 170)
    expect(world.match.round).toBe(2)
    expect(world.match.phase).toBe('intro')
    expect(world.match.winner).toBeNull()
  })

  it('speaks ROUND 1 then FIGHT during intro', () => {
    cancelAnnounce()
    const world = createMatch({ p1: 'bob', p2: 'ninja', p2Cpu: false })
    expect(world.match.announce).toBe('ROUND 1')
    expect(spokenCallouts()).toEqual(['Round 1!'])
    skip(world, 70)
    expect(world.match.announce).toBe('FIGHT')
    expect(spokenCallouts()).toEqual(['Round 1!', 'Fight!'])
  })

  it('lets PERFECT and DOUBLE K.O. keep K.O. quiet in the same frame', () => {
    const perfect = createMatch({ p1: 'bob', p2: 'ninja', p2Cpu: false })
    skip(perfect, 120)
    cancelAnnounce()
    perfect.fighters[1].hp = 0
    tickMatch(perfect, [emptyInput(), emptyInput()], false)
    expect(perfect.match.announce).toBe('K.O.')
    expect(spokenCallouts()).toEqual(['Perfect!'])

    const dbl = createMatch({ p1: 'bob', p2: 'ninja', p2Cpu: false })
    skip(dbl, 120)
    cancelAnnounce()
    dbl.fighters[0].hp = 0
    dbl.fighters[1].hp = 0
    tickMatch(dbl, [emptyInput(), emptyInput()], false)
    expect(dbl.match.announce).toBe('K.O.')
    expect(spokenCallouts()).toEqual(['Double K.O.!'])
  })

  it('speaks K.O., TIME, Round 2, and YOU WIN on those banners', () => {
    const ko = createMatch({ p1: 'bob', p2: 'ninja', p2Cpu: false })
    skip(ko, 120)
    cancelAnnounce()
    ko.fighters[0].hp = 400
    ko.fighters[1].hp = 0
    tickMatch(ko, [emptyInput(), emptyInput()], false)
    expect(spokenCallouts()).toEqual(['K.O.!'])

    const time = createMatch({ p1: 'bob', p2: 'ninja', p2Cpu: false })
    skip(time, 120)
    cancelAnnounce()
    time.match.timer = 0
    tickMatch(time, [emptyInput(), emptyInput()], false)
    expect(spokenCallouts()).toEqual(['Time!'])

    const next = createMatch({ p1: 'bob', p2: 'ninja', p2Cpu: false })
    skip(next, 120)
    next.fighters[1].hp = 0
    skip(next, 170)
    expect(next.match.round).toBe(2)
    expect(spokenCallouts()).toContain('Round 2!')

    const win = createMatch({ p1: 'bob', p2: 'ninja', p2Cpu: false })
    skip(win, 120)
    win.match.wins[0] = 1
    win.fighters[1].hp = 0
    tickMatch(win, [emptyInput(), emptyInput()], false)
    cancelAnnounce()
    skip(win, 51)
    expect(win.match.announce).toBe('YOU WIN')
    expect(spokenCallouts()).toEqual(['You win!'])
  })

  it('armor absorbs a hit with no damage and no hitstun', () => {
    const world = createMatch({ p1: 'bob', p2: 'cyber', p2Cpu: false })
    skip(world, 120)
    world.fighters[1].x = world.fighters[0].x + 28
    world.fighters[1].armorLeft = 1
    tickMatch(world, [hold(emptyInput(), { lp: true }), emptyInput()], false)
    skip(world, 8)
    expect(world.fighters[1].hp).toBe(1000)
    expect(world.fighters[1].status).not.toBe('hurt')
    expect(world.fighters[1].armorLeft).toBe(0)
  })

  it('cancelInto is a whitelist of specials', () => {
    const world = createMatch({ p1: 'chainsaw', p2: 'bob', p2Cpu: false })
    skip(world, 120)
    world.fighters[1].x = world.fighters[0].x + 30
    let p1 = emptyInput()
    for (const dir of [2, 3, 6]) {
      p1 = hold(p1, { dir, lp: dir === 6, lpPress: dir === 6, punchPress: dir === 6 })
      tickMatch(world, [p1, emptyInput()], false)
    }
    skip(world, 20)
    expect(world.fighters[0].canCancel).toBe(true)
    let again = emptyInput()
    for (const dir of [2, 3, 6]) {
      again = hold(again, { dir, lp: dir === 6, lpPress: dir === 6, punchPress: dir === 6 })
      tickMatch(world, [again, emptyInput()], false)
    }
    expect(world.fighters[0].moveId?.startsWith('chainHook')).toBe(true)

    const slash = createMatch({ p1: 'chainsaw', p2: 'bob', p2Cpu: false })
    skip(slash, 120)
    slash.fighters[1].x = slash.fighters[0].x + 30
    let s1 = emptyInput()
    for (const dir of [2, 3, 6]) {
      s1 = hold(s1, { dir, lp: dir === 6, lpPress: dir === 6, punchPress: dir === 6 })
      tickMatch(slash, [s1, emptyInput()], false)
    }
    skip(slash, 20)
    let s2 = emptyInput()
    for (const dir of [2, 3, 6]) {
      s2 = hold(s2, { dir, hk: dir === 6, hkPress: dir === 6, kickPress: dir === 6 })
      tickMatch(slash, [s2, emptyInput()], false)
    }
    expect(slash.fighters[0].moveId?.startsWith('sawSlash')).toBe(true)
  })
})
