export const STAGE_IDS = ['billabong', 'dojo', 'neonlab'] as const
export type StageId = (typeof STAGE_IDS)[number]

export function pickStage(exclude?: StageId, rng: () => number = Math.random): StageId {
  const pool = STAGE_IDS.filter((id) => id !== exclude)
  return pool[Math.floor(rng() * pool.length)] ?? STAGE_IDS[0]
}

export function stageUrl(id: StageId): string {
  return `${import.meta.env.BASE_URL}stage/${id}.jpg`
}
