export interface AdvancementDefinition {
  id: string
  slug: string
  label: string
  description: string | null
  groupLabel: string
}

export function buildAdvancementDefinition(advancementId: string, officialText?: Partial<VanillaAdvancementText>): AdvancementDefinition {
  const [, pathPart] = advancementId.split(':')
  const [category, name] = pathPart!.split('/')

  return {
    id: advancementId,
    slug: encodeAdvancementSlug(advancementId),
    label: officialText?.title ?? humanizeMinecraftId(name!),
    description: officialText?.description ?? null,
    groupLabel: humanizeMinecraftId(category!)
  }
}
