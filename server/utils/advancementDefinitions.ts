export interface AdvancementDefinition {
  id: string
  slug: string
  label: string
  description: string | null
  groupLabel: string
}

export function buildAdvancementDefinition(advancementId: string, vanillaTextByAdvancementId: Record<string, Partial<VanillaAdvancementText>>): AdvancementDefinition {
  const [, pathPart] = advancementId.split(':')
  const [category, name] = pathPart!.split('/')
  const officialText = vanillaTextByAdvancementId[advancementId]
  const officialCategoryTitle = vanillaTextByAdvancementId[`minecraft:${category}/root`]?.title

  return {
    id: advancementId,
    slug: encodeAdvancementSlug(advancementId),
    label: officialText?.title ?? humanizeMinecraftId(name!),
    description: officialText?.description ?? null,
    groupLabel: officialCategoryTitle ?? humanizeMinecraftId(category!)
  }
}
