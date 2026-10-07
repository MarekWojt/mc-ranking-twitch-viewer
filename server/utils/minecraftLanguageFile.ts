const VANILLA_LANGUAGE_FILE_URL = 'https://raw.githubusercontent.com/misode/mcmeta/assets/assets/minecraft/lang/en_us.json'

const languageFileCacheOptions = {
  name: 'minecraft-language-file',
  getKey: () => 'all',
  maxAge: 86400
}

export const loadVanillaLanguageFile = defineCachedFunction(async (): Promise<Record<string, string>> => {
  const languageFileBytes = await getOrDownloadCachedIcon('minecraft-lang/en_us.json', VANILLA_LANGUAGE_FILE_URL)
  if (languageFileBytes === null) return {}

  try {
    return JSON.parse(languageFileBytes.toString('utf8')) as Record<string, string>
  } catch {
    return {}
  }
}, languageFileCacheOptions)
