const VANILLA_ADVANCEMENT_DEFINITION_BASE_URL = 'https://raw.githubusercontent.com/misode/mcmeta/data/data/minecraft/advancement'

interface VanillaAdvancementDefinitionFile {
  display?: {
    icon?: {
      id?: string
    }
  }
}

function advancementDefinitionCacheKey(advancementId: string): string {
  const [, pathPart] = advancementId.split(':')
  return `advancement-defs/${pathPart}.json`
}

function advancementDefinitionDownloadUrl(advancementId: string): string {
  const [, pathPart] = advancementId.split(':')
  return `${VANILLA_ADVANCEMENT_DEFINITION_BASE_URL}/${pathPart}.json`
}

async function resolveAdvancementIconItemBareId(advancementId: string): Promise<string | null> {
  const definitionBytes = await getOrDownloadCachedIcon(advancementDefinitionCacheKey(advancementId), advancementDefinitionDownloadUrl(advancementId))
  if (definitionBytes === null) return null

  try {
    const definition = JSON.parse(definitionBytes.toString('utf8')) as VanillaAdvancementDefinitionFile
    const iconId = definition.display?.icon?.id
    return iconId ? stripMinecraftNamespace(iconId) : null
  } catch {
    return null
  }
}

export async function resolveAdvancementIconsBySlug(advancementDefinitions: AdvancementDefinition[]): Promise<Record<string, string>> {
  const iconItemBareIdByAdvancementId = new Map<string, string>()
  await Promise.all(advancementDefinitions.map(async (definition) => {
    const iconItemBareId = await resolveAdvancementIconItemBareId(definition.id)
    if (iconItemBareId !== null) iconItemBareIdByAdvancementId.set(definition.id, iconItemBareId)
  }))

  const itemIconsByBareId = await resolveItemIconsByBareId([...new Set(iconItemBareIdByAdvancementId.values())])

  const advancementIconsBySlug: Record<string, string> = {}
  for (const definition of advancementDefinitions) {
    const iconItemBareId = iconItemBareIdByAdvancementId.get(definition.id)
    const iconDataUri = iconItemBareId !== undefined ? itemIconsByBareId[iconItemBareId] : undefined
    if (iconDataUri !== undefined) advancementIconsBySlug[definition.slug] = iconDataUri
  }

  return advancementIconsBySlug
}
