const ADVANCEMENT_TRANSLATION_KEY_PATTERN = /^advancements\.([a-z_]+)\.([a-z_]+)\.(title|description)$/

export interface VanillaAdvancementText {
  title: string
  description: string
}

const advancementTextCacheOptions = {
  name: 'advancement-text',
  getKey: (locale: MinecraftLocale) => locale,
  maxAge: 86400
}

export const loadVanillaAdvancementTextByAdvancementId = defineCachedFunction(async (locale: MinecraftLocale): Promise<Record<string, Partial<VanillaAdvancementText>>> => {
  const allTranslationsByKey = await loadVanillaLanguageFile(locale)
  const textByAdvancementId: Record<string, Partial<VanillaAdvancementText>> = {}

  for (const [translationKey, translation] of Object.entries(allTranslationsByKey)) {
    const match = translationKey.match(ADVANCEMENT_TRANSLATION_KEY_PATTERN)
    if (!match) continue

    const advancementId = `minecraft:${match[1]}/${match[2]}`
    const field = match[3] as 'title' | 'description'
    textByAdvancementId[advancementId] = { ...textByAdvancementId[advancementId], [field]: translation }
  }

  return textByAdvancementId
}, advancementTextCacheOptions)
