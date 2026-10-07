export interface AdvancementDefinition {
  id: string
  slug: string
  category: string
  label: LocalizedLabel
  description: LocalizedOptionalText | null
  groupLabel: LocalizedLabel
}

export interface VanillaAdvancementTextByLocale {
  en: Record<string, Partial<VanillaAdvancementText>>
  de: Record<string, Partial<VanillaAdvancementText>>
}

export function buildAdvancementDefinition(advancementId: string, vanillaTextByAdvancementIdByLocale: VanillaAdvancementTextByLocale): AdvancementDefinition {
  const [, pathPart] = advancementId.split(':')
  const [category, name] = pathPart!.split('/')
  const rootAdvancementId = `minecraft:${category}/root`

  const officialTextEn = vanillaTextByAdvancementIdByLocale.en[advancementId]
  const officialTextDe = vanillaTextByAdvancementIdByLocale.de[advancementId]
  const officialCategoryTitleEn = vanillaTextByAdvancementIdByLocale.en[rootAdvancementId]?.title
  const officialCategoryTitleDe = vanillaTextByAdvancementIdByLocale.de[rootAdvancementId]?.title

  const descriptionEn = officialTextEn?.description ?? null
  const descriptionDe = officialTextDe?.description ?? null

  return {
    id: advancementId,
    slug: encodeAdvancementSlug(advancementId),
    category: category!,
    label: {
      en: officialTextEn?.title ?? humanizeMinecraftId(name!),
      de: officialTextDe?.title ?? null
    },
    description: descriptionEn === null && descriptionDe === null ? null : { en: descriptionEn, de: descriptionDe },
    groupLabel: {
      en: officialCategoryTitleEn ?? humanizeMinecraftId(category!),
      de: officialCategoryTitleDe ?? null
    }
  }
}
