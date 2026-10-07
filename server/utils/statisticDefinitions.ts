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

export interface VanillaStatisticDisplayNames {
  itemNamesByBareId: Record<string, string>
  entityNamesByBareId: Record<string, string>
  statisticNamesByKey: Record<string, string>
  statisticTypeNamesByKey: Record<string, string>
}

function resolveOfficialStatisticLabel(
  category: string,
  key: string,
  isGeneralStatistic: boolean,
  specificSubgroup: SpecificStatisticSubgroup | null,
  vanillaDisplayNames: VanillaStatisticDisplayNames
): string | undefined {
  const bareKey = stripMinecraftNamespace(key)

  if (isGeneralStatistic) return vanillaDisplayNames.statisticNamesByKey[bareKey]
  if (specificSubgroup === 'items') return vanillaDisplayNames.itemNamesByBareId[bareKey]
  if (specificSubgroup === 'entities') return vanillaDisplayNames.entityNamesByBareId[bareKey]
  return undefined
}

export function buildStatisticDefinition(category: string, key: string, vanillaDisplayNames: VanillaStatisticDisplayNames): StatisticDefinition {
  const isGeneralStatistic = category === GENERAL_STATISTIC_CATEGORY
  const specificSubgroup = isGeneralStatistic ? null : classifySpecificStatisticSubgroup(category)
  const officialLabel = resolveOfficialStatisticLabel(category, key, isGeneralStatistic, specificSubgroup, vanillaDisplayNames)

  return {
    slug: encodeStatisticSlug(category, key),
    category,
    key,
    group: isGeneralStatistic ? 'allgemein' : 'spezifisch',
    groupLabel: isGeneralStatistic
      ? classifyGeneralStatisticTheme(key)
      : vanillaDisplayNames.statisticTypeNamesByKey[stripMinecraftNamespace(category)] ?? humanizeMinecraftId(category),
    specificSubgroup,
    label: officialLabel ?? humanizeMinecraftId(key)
  }
}

export function collectStatisticDefinitions(
  statsByMinecraftUuid: Record<string, RawStatisticsByCategory>,
  vanillaDisplayNames: VanillaStatisticDisplayNames
): StatisticDefinition[] {
  const definitionsBySlug = new Map<string, StatisticDefinition>()

  for (const categories of Object.values(statsByMinecraftUuid)) {
    for (const [category, valuesByKey] of Object.entries(categories)) {
      for (const key of Object.keys(valuesByKey)) {
        definitionsBySlug.set(encodeStatisticSlug(category, key), buildStatisticDefinition(category, key, vanillaDisplayNames))
      }
    }
  }

  return [...definitionsBySlug.values()]
}
