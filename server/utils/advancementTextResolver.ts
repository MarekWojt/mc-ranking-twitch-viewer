const VANILLA_LANGUAGE_FILE_URL = 'https://raw.githubusercontent.com/misode/mcmeta/assets/assets/minecraft/lang/en_us.json'
const ADVANCEMENT_TRANSLATION_KEY_PATTERN = /^advancements\.([a-z_]+)\.([a-z_]+)\.(title|description)$/

export interface VanillaAdvancementText {
  title: string
  description: string
}

const advancementTextCacheOptions = {
  name: 'advancement-text',
  getKey: () => 'all',
  maxAge: 86400
}

export const loadVanillaAdvancementTextByAdvancementId = defineCachedFunction(async (): Promise<Record<string, Partial<VanillaAdvancementText>>> => {
  const languageFileBytes = await getOrDownloadCachedIcon('advancement-lang/en_us.json', VANILLA_LANGUAGE_FILE_URL)
  if (languageFileBytes === null) return {}

  try {
    const allTranslationsByKey = JSON.parse(languageFileBytes.toString('utf8')) as Record<string, string>
    const textByAdvancementId: Record<string, Partial<VanillaAdvancementText>> = {}

    for (const [translationKey, translation] of Object.entries(allTranslationsByKey)) {
      const match = translationKey.match(ADVANCEMENT_TRANSLATION_KEY_PATTERN)
      if (!match) continue

      const advancementId = `minecraft:${match[1]}/${match[2]}`
      const field = match[3] as 'title' | 'description'
      textByAdvancementId[advancementId] = { ...textByAdvancementId[advancementId], [field]: translation }
    }

    return textByAdvancementId
  } catch {
    return {}
  }
}, advancementTextCacheOptions)
