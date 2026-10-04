export const GENERAL_STATISTIC_CATEGORY = 'minecraft:custom'

const ITEM_RELATED_STATISTIC_CATEGORIES = new Set([
  'minecraft:mined',
  'minecraft:broken',
  'minecraft:crafted',
  'minecraft:used',
  'minecraft:picked_up',
  'minecraft:dropped'
])

const ENTITY_RELATED_STATISTIC_CATEGORIES = new Set([
  'minecraft:killed',
  'minecraft:killed_by'
])

function classifySpecificStatisticSubgroup(category: string): SpecificStatisticSubgroup | null {
  if (ITEM_RELATED_STATISTIC_CATEGORIES.has(category)) return 'items'
  if (ENTITY_RELATED_STATISTIC_CATEGORIES.has(category)) return 'entities'
  return null
}

export function buildStatisticDefinition(category: string, key: string): StatisticDefinition {
  const isGeneralStatistic = category === GENERAL_STATISTIC_CATEGORY

  return {
    slug: encodeStatisticSlug(category, key),
    category,
    key,
    group: isGeneralStatistic ? 'allgemein' : 'spezifisch',
    groupLabel: isGeneralStatistic ? classifyGeneralStatisticTheme(key) : humanizeMinecraftId(category),
    specificSubgroup: isGeneralStatistic ? null : classifySpecificStatisticSubgroup(category),
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
