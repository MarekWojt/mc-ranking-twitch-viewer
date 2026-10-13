export const DEFAULT_STATISTIC_WEIGHT = 1

export type ScoreGroup = 'allgemein' | SpecificStatisticSubgroup | 'advancements'

export const SCORE_GROUP_SHARES: Record<ScoreGroup, number> = {
  allgemein: 0.3,
  items: 0.3,
  entities: 0.1,
  advancements: 0.3
}

export const STATISTIC_WEIGHTS_BY_CATEGORY: Record<string, number> = {
  'minecraft:picked_up': 0.1,
  'minecraft:dropped': 0.1,
  'minecraft:broken': -1,
  'minecraft:killed_by': -1
}

export function resolveCategoryWeight(category: string): number {
  return STATISTIC_WEIGHTS_BY_CATEGORY[category] ?? DEFAULT_STATISTIC_WEIGHT
}

export function resolveStatisticScoreGroup(specificSubgroup: SpecificStatisticSubgroup | null): ScoreGroup {
  return specificSubgroup ?? 'allgemein'
}
