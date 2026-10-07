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

export interface VanillaStatisticDisplayNamesByLocale {
  itemNamesByBareId: Record<string, string>
  entityNamesByBareId: Record<string, string>
  statisticNamesByKey: Record<string, string>
  statisticTypeNamesByKey: Record<string, string>
}

export interface VanillaStatisticDisplayNames {
  en: VanillaStatisticDisplayNamesByLocale
  de: VanillaStatisticDisplayNamesByLocale
}

function resolveOfficialStatisticLabel(
  key: string,
  isGeneralStatistic: boolean,
  specificSubgroup: SpecificStatisticSubgroup | null,
  namesByLocale: VanillaStatisticDisplayNamesByLocale
): string | undefined {
  const bareKey = stripMinecraftNamespace(key)

  if (isGeneralStatistic) return namesByLocale.statisticNamesByKey[bareKey]
  if (specificSubgroup === 'items') return namesByLocale.itemNamesByBareId[bareKey]
  if (specificSubgroup === 'entities') return namesByLocale.entityNamesByBareId[bareKey]
  return undefined
}

export function buildStatisticDefinition(category: string, key: string, vanillaDisplayNames: VanillaStatisticDisplayNames): StatisticDefinition {
  const isGeneralStatistic = category === GENERAL_STATISTIC_CATEGORY
  const specificSubgroup = isGeneralStatistic ? null : classifySpecificStatisticSubgroup(category)

  const officialLabelEn = resolveOfficialStatisticLabel(key, isGeneralStatistic, specificSubgroup, vanillaDisplayNames.en)
  const officialLabelDe = resolveOfficialStatisticLabel(key, isGeneralStatistic, specificSubgroup, vanillaDisplayNames.de)

  // the "Allgemein" theme grouping (e.g. "Generell") is our own fixed German UI taxonomy, not Minecraft content,
  // so it intentionally ignores the locale setting by using the same text for both en/de
  const generalTheme = isGeneralStatistic ? classifyGeneralStatisticTheme(key) : null
  const officialGroupLabelEn = generalTheme ?? vanillaDisplayNames.en.statisticTypeNamesByKey[stripMinecraftNamespace(category)]
  const officialGroupLabelDe = generalTheme ?? vanillaDisplayNames.de.statisticTypeNamesByKey[stripMinecraftNamespace(category)]

  return {
    slug: encodeStatisticSlug(category, key),
    category,
    key,
    group: isGeneralStatistic ? 'allgemein' : 'spezifisch',
    groupLabel: {
      en: officialGroupLabelEn ?? humanizeMinecraftId(category),
      de: officialGroupLabelDe ?? null
    },
    specificSubgroup,
    label: {
      en: officialLabelEn ?? humanizeMinecraftId(key),
      de: officialLabelDe ?? null
    }
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
