import type { CharId } from '../config.ts'

export const STAGE_IDS = ['billabong', 'dojo', 'neonlab', 'armybase', 'toolshed'] as const
export type StageId = (typeof STAGE_IDS)[number]
export type StagePick = StageId | 'random'

export const STAGE_META: Record<StageId, { name: string }> = {
  billabong: { name: 'BILLABONG' },
  dojo: { name: 'DOJO' },
  neonlab: { name: 'NEON LAB' },
  armybase: { name: 'ARMY BASE' },
  toolshed: { name: 'TOOL SHED' },
}

/** One home stage per fighter. Add a row when you add a character. */
export const CHAR_STAGE: Record<CharId, StageId> = {
  bob: 'billabong',
  ninja: 'dojo',
  cyber: 'neonlab',
  soldier: 'armybase',
  chainsaw: 'toolshed',
}

export function pickStage(exclude?: StageId, rng: () => number = Math.random): StageId {
  const pool = STAGE_IDS.filter((id) => id !== exclude)
  return pool[Math.floor(rng() * pool.length)] ?? STAGE_IDS[0]
}

export function stageForSession(
  pick: StagePick | undefined,
  exclude?: StageId,
  rng: () => number = Math.random,
): StageId {
  if (pick && pick !== 'random') return pick
  return pickStage(exclude, rng)
}

export function stageUrl(id: StageId): string {
  return `${import.meta.env.BASE_URL}stage/${id}.jpg`
}
