// keyed by bare statistic key only (not category) to avoid a module-init-order circular
// dependency with statisticDefinitions.ts's GENERAL_STATISTIC_CATEGORY constant
const STATISTIC_WEIGHTS_BY_KEY: Record<string, number> = {
  'minecraft:time_since_rest': -1,
  'minecraft:leave_game': 0,
  'minecraft:damage_taken': -1,
  'minecraft:deaths': -1,
  'minecraft:player_kills': 0
}

export function resolveStatisticWeight(category: string, key: string): number {
  return STATISTIC_WEIGHTS_BY_KEY[key] ?? resolveCategoryWeight(category)
}
