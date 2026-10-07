function extractNamesByBareId(allTranslationsByKey: Record<string, string>, translationKeyPattern: RegExp): Record<string, string> {
  const namesByBareId: Record<string, string> = {}

  for (const [translationKey, name] of Object.entries(allTranslationsByKey)) {
    const match = translationKey.match(translationKeyPattern)
    if (match) namesByBareId[match[1]!] = name
  }

  return namesByBareId
}

const ITEM_OR_BLOCK_TRANSLATION_KEY_PATTERN = /^(?:item|block)\.minecraft\.([a-z0-9_]+)$/
const ENTITY_TRANSLATION_KEY_PATTERN = /^entity\.minecraft\.([a-z0-9_]+)$/
const STATISTIC_TRANSLATION_KEY_PATTERN = /^stat\.minecraft\.([a-z0-9_]+)$/
const STATISTIC_TYPE_TRANSLATION_KEY_PATTERN = /^stat_type\.minecraft\.([a-z0-9_]+)$/

export const loadVanillaItemNamesByBareId = defineCachedFunction(async (locale: MinecraftLocale): Promise<Record<string, string>> => {
  const allTranslationsByKey = await loadVanillaLanguageFile(locale)
  return extractNamesByBareId(allTranslationsByKey, ITEM_OR_BLOCK_TRANSLATION_KEY_PATTERN)
}, { name: 'minecraft-item-names', getKey: (locale: MinecraftLocale) => locale, maxAge: 86400 })

export const loadVanillaEntityNamesByBareId = defineCachedFunction(async (locale: MinecraftLocale): Promise<Record<string, string>> => {
  const allTranslationsByKey = await loadVanillaLanguageFile(locale)
  return extractNamesByBareId(allTranslationsByKey, ENTITY_TRANSLATION_KEY_PATTERN)
}, { name: 'minecraft-entity-names', getKey: (locale: MinecraftLocale) => locale, maxAge: 86400 })

export const loadVanillaStatisticNamesByKey = defineCachedFunction(async (locale: MinecraftLocale): Promise<Record<string, string>> => {
  const allTranslationsByKey = await loadVanillaLanguageFile(locale)
  return extractNamesByBareId(allTranslationsByKey, STATISTIC_TRANSLATION_KEY_PATTERN)
}, { name: 'minecraft-statistic-names', getKey: (locale: MinecraftLocale) => locale, maxAge: 86400 })

// killed/killed_by have no official short form in either language, only full-sentence templates ("You killed %s %s") -
// supply a hand-written short label for them, like the alias tables in minecraftWikiIconResolver.ts
const STATISTIC_TYPE_LABEL_OVERRIDES_BY_LOCALE: Record<MinecraftLocale, Record<string, string>> = {
  en: {},
  de: {
    killed: 'Getötet',
    killed_by: 'Getötet von'
  }
}

export const loadVanillaStatisticTypeNamesByKey = defineCachedFunction(async (locale: MinecraftLocale): Promise<Record<string, string>> => {
  const allTranslationsByKey = await loadVanillaLanguageFile(locale)
  const namesByKey = extractNamesByBareId(allTranslationsByKey, STATISTIC_TYPE_TRANSLATION_KEY_PATTERN)

  // some stat_type entries (killed/killed_by) are sentence templates with %s placeholders, unusable as a short column label
  const cleanedNamesByKey = Object.fromEntries(Object.entries(namesByKey).filter(([, name]) => !name.includes('%s')))

  return { ...cleanedNamesByKey, ...STATISTIC_TYPE_LABEL_OVERRIDES_BY_LOCALE[locale] }
}, { name: 'minecraft-statistic-type-names', getKey: (locale: MinecraftLocale) => locale, maxAge: 86400 })

export async function loadVanillaStatisticDisplayNamesByLocale(locale: MinecraftLocale): Promise<VanillaStatisticDisplayNamesByLocale> {
  const [itemNamesByBareId, entityNamesByBareId, statisticNamesByKey, statisticTypeNamesByKey] = await Promise.all([
    loadVanillaItemNamesByBareId(locale),
    loadVanillaEntityNamesByBareId(locale),
    loadVanillaStatisticNamesByKey(locale),
    loadVanillaStatisticTypeNamesByKey(locale)
  ])

  return { itemNamesByBareId, entityNamesByBareId, statisticNamesByKey, statisticTypeNamesByKey }
}
