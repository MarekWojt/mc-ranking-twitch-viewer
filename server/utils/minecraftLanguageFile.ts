export type MinecraftLocale = 'en' | 'de'

const VANILLA_LANGUAGE_FILE_URL_BY_LOCALE: Record<MinecraftLocale, string> = {
  en: 'https://raw.githubusercontent.com/misode/mcmeta/assets/assets/minecraft/lang/en_us.json',
  de: 'https://raw.githubusercontent.com/misode/mcmeta/assets/assets/minecraft/lang/de_de.json'
}

const languageFileCacheOptions = {
  name: 'minecraft-language-file',
  getKey: (locale: MinecraftLocale) => locale,
  maxAge: 86400
}

export const loadVanillaLanguageFile = defineCachedFunction(async (locale: MinecraftLocale): Promise<Record<string, string>> => {
  const languageFileBytes = await getOrDownloadCachedIcon(`minecraft-lang/${locale}.json`, VANILLA_LANGUAGE_FILE_URL_BY_LOCALE[locale])
  if (languageFileBytes === null) return {}

  try {
    return JSON.parse(languageFileBytes.toString('utf8')) as Record<string, string>
  } catch {
    return {}
  }
}, languageFileCacheOptions)
