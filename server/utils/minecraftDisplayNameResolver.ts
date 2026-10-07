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

export const loadVanillaItemNamesByBareId = defineCachedFunction(async (): Promise<Record<string, string>> => {
  const allTranslationsByKey = await loadVanillaLanguageFile()
  return extractNamesByBareId(allTranslationsByKey, ITEM_OR_BLOCK_TRANSLATION_KEY_PATTERN)
}, { name: 'minecraft-item-names', getKey: () => 'all', maxAge: 86400 })

export const loadVanillaEntityNamesByBareId = defineCachedFunction(async (): Promise<Record<string, string>> => {
  const allTranslationsByKey = await loadVanillaLanguageFile()
  return extractNamesByBareId(allTranslationsByKey, ENTITY_TRANSLATION_KEY_PATTERN)
}, { name: 'minecraft-entity-names', getKey: () => 'all', maxAge: 86400 })

export const loadVanillaStatisticNamesByKey = defineCachedFunction(async (): Promise<Record<string, string>> => {
  const allTranslationsByKey = await loadVanillaLanguageFile()
  return extractNamesByBareId(allTranslationsByKey, STATISTIC_TRANSLATION_KEY_PATTERN)
}, { name: 'minecraft-statistic-names', getKey: () => 'all', maxAge: 86400 })

export const loadVanillaStatisticTypeNamesByKey = defineCachedFunction(async (): Promise<Record<string, string>> => {
  const allTranslationsByKey = await loadVanillaLanguageFile()
  const namesByKey = extractNamesByBareId(allTranslationsByKey, STATISTIC_TYPE_TRANSLATION_KEY_PATTERN)

  // some stat_type entries (killed/killed_by) are sentence templates with %s placeholders, unusable as a short column label
  return Object.fromEntries(Object.entries(namesByKey).filter(([, name]) => !name.includes('%s')))
}, { name: 'minecraft-statistic-type-names', getKey: () => 'all', maxAge: 86400 })
