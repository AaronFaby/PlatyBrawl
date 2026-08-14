import { GROUND_Y, MAX_HP, ROUND_SECONDS, WINS_NEEDED } from '../config.ts'
import { pickStage } from '../data/stages.ts'
import type { VirtualInput } from '../input/virtual.ts'
import { clashProjectiles, spawnFrom, tickProjectiles } from './projectile.ts'
import { resolveProjectiles, resolveStrikes } from './combat.ts'
import {
  createFighter,
  dummyBlockInput,
  faceOpponent,
  resetFighter,
  tickFighter,
} from './fighter.ts'
import { clampStage, resolvePush } from './physics.ts'
import type { Fighter, MatchState, PlayerId, Session } from './types.ts'

export type FightWorld = {
  match: MatchState
  fighters: [Fighter, Fighter]
  session: Session
  frame: number
}

export function createMatch(session: Session): FightWorld {
  const fighters: [Fighter, Fighter] = [
    createFighter(0, session.p1, 220, 1),
    createFighter(1, session.p2, 500, -1),
  ]
  return {
    session,
    fighters,
    frame: 0,
    match: freshMatch(),
  }
}

function freshMatch(): MatchState {
  return {
    phase: 'intro',
    phaseTicks: 0,
    round: 1,
    timer: ROUND_SECONDS,
    timerAcc: 0,
    wins: [0, 0],
    hitstop: 0,
    shake: 0,
    sparks: [],
    projectiles: [],
    announce: 'ROUND 1',
    winner: null,
    timeout: false,
    stageId: pickStage(),
  }
}

function startRound(world: FightWorld, round: number): void {
  resetFighter(world.fighters[0], 220, 1)
  resetFighter(world.fighters[1], 500, -1)
  world.match.phase = 'intro'
  world.match.phaseTicks = 0
  world.match.round = round
  world.match.timer = ROUND_SECONDS
  world.match.timerAcc = 0
  world.match.hitstop = 0
  world.match.shake = 0
  world.match.sparks = []
  world.match.projectiles = []
  world.match.announce = `ROUND ${round}`
  world.match.timeout = false
  world.match.stageId = pickStage(world.match.stageId)
  world.fighters[0].hp = MAX_HP
  world.fighters[1].hp = MAX_HP
}

export function tickMatch(
  world: FightWorld,
  inputs: [VirtualInput, VirtualInput],
  dummyBlock: boolean,
): void {
  const { match, fighters } = world
  world.frame += 1
  if (match.shake > 0) match.shake -= 0.35
  for (const s of match.sparks) s.life -= 1
  match.sparks = match.sparks.filter((s) => s.life > 0)

  if (dummyBlock) inputs[1] = dummyBlockInput(fighters[1], fighters[0])

  const locked = match.phase !== 'fight'
  const hooksFor = (id: PlayerId) => ({
    frame: world.frame,
    other: fighters[id === 0 ? 1 : 0],
    match,
    spawnProjectile: (owner: Fighter, kind: 'shuriken' | 'beam' | 'bullet', heavy: boolean) => {
      match.projectiles.push(spawnFrom(owner, kind, heavy))
    },
  })

  if (match.phase === 'intro') {
    match.phaseTicks += 1
    if (match.phaseTicks < 70) match.announce = `ROUND ${match.round}`
    else if (match.phaseTicks < 110) match.announce = 'FIGHT'
    else {
      match.phase = 'fight'
      match.phaseTicks = 0
      match.announce = ''
    }
  } else if (match.phase === 'fight') {
    if (match.hitstop > 0) match.hitstop -= 1
    match.timerAcc += 1
    if (match.timerAcc >= 60) {
      match.timerAcc = 0
      match.timer = Math.max(0, match.timer - 1)
    }
    const ko0 = fighters[0].hp <= 0
    const ko1 = fighters[1].hp <= 0
    if (ko0 || ko1) {
      match.phase = 'ko'
      match.phaseTicks = 0
      match.announce = 'K.O.'
      if (ko0 && ko1) {
        // double KO — higher remaining wins already 0; treat as draw round (no win)
        match.winner = fighters[0].hp === fighters[1].hp ? null : fighters[0].hp > fighters[1].hp ? 0 : 1
      } else {
        match.winner = ko0 ? 1 : 0
      }
    } else if (match.timer <= 0) {
      match.phase = 'timeout'
      match.phaseTicks = 0
      match.announce = 'TIME'
      match.timeout = true
      if (fighters[0].hp === fighters[1].hp) match.winner = null
      else match.winner = fighters[0].hp > fighters[1].hp ? 0 : 1
    }
  } else if (match.phase === 'ko' || match.phase === 'timeout') {
    match.phaseTicks += 1
    if (match.phaseTicks === 50 && match.winner !== null) {
      match.wins[match.winner] += 1
    }
    if (match.phaseTicks > 50 && match.winner !== null) {
      match.announce = match.wins[match.winner] >= WINS_NEEDED ? 'YOU WIN' : ''
      fighters[match.winner].status = fighters[match.winner].hp > 0 ? 'win' : 'ko'
      if (fighters[match.winner].hp > 0) {
        fighters[match.winner].anim = 'win'
      }
    }
    if (match.phaseTicks > 160) {
      if (match.winner !== null && match.wins[match.winner] >= WINS_NEEDED) {
        match.phase = 'over'
        match.announce = ''
      } else {
        startRound(world, match.round + 1)
        return
      }
    }
  }

  faceOpponent(fighters[0], fighters[1])
  faceOpponent(fighters[1], fighters[0])

  tickFighter(fighters[0], inputs[0], hooksFor(0), locked)
  tickFighter(fighters[1], inputs[1], hooksFor(1), locked)
  clampStage(fighters[0])
  clampStage(fighters[1])
  resolvePush(fighters[0], fighters[1])
  tickProjectiles(match.projectiles)
  clashProjectiles(match.projectiles)

  if (match.phase === 'fight') {
    resolveStrikes(fighters[0], fighters[1], inputs[0], inputs[1], match)
    resolveProjectiles(fighters, inputs, match.projectiles, match)
  }

  for (const f of fighters) {
    if (f.y > GROUND_Y) f.y = GROUND_Y
  }
}
