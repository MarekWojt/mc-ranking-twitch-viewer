export const GENERAL_STATISTIC_CATEGORY = 'minecraft:custom'

export function buildStatisticDefinition(category: string, key: string): StatisticDefinition {
  const isGeneralStatistic = category === GENERAL_STATISTIC_CATEGORY

  return {
    slug: encodeStatisticSlug(category, key),
    category,
    key,
    group: isGeneralStatistic ? 'allgemein' : 'spezifisch',
    groupLabel: isGeneralStatistic ? null : humanizeMinecraftId(category),
    label: humanizeMinecraftId(key)
  }
}

export function collectStatisticDefinitions(statsByMinecraftUuid: Record<string, RawStatisticsByCategory>): StatisticDefinition[] {
  const definitionsBySlug = new Map<string, StatisticDefinition>()

  for (const categories of Object.values(statsByMinecraftUuid)) {
    for (const [category, valuesByKey] of Object.entries(categories)) {
      for (const key of Object.keys(valuesByKey)) {
        definitionsBySlug.set(encodeStatisticSlug(category, key), buildStatisticDefinition(category, key))
      }
    }
  }

  return [...definitionsBySlug.values()]
}
