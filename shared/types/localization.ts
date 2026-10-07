export type MinecraftNameLocale = 'de' | 'en'

export interface LocalizedLabel {
  en: string
  de: string | null
}

export interface LocalizedOptionalText {
  en: string | null
  de: string | null
}
