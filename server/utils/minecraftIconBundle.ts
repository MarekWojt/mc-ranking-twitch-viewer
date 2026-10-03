function stripMinecraftNamespace(minecraftId: string): string {
  const namespaceSeparatorIndex = minecraftId.indexOf(':')
  return namespaceSeparatorIndex === -1 ? minecraftId : minecraftId.slice(namespaceSeparatorIndex + 1)
}

const minecraftIconBundleCacheOptions = {
  name: 'minecraft-icon-bundle',
  getKey: () => 'all',
  maxAge: 86400
}

export const buildMinecraftIconBundle = defineCachedFunction(async (statisticDefinitions: StatisticDefinition[]): Promise<MinecraftIconBundleDto> => {
  const itemBareIds = [...new Set(
    statisticDefinitions.filter(definition => definition.specificSubgroup === 'items').map(definition => stripMinecraftNamespace(definition.key))
  )]
  const entityBareIds = [...new Set(
    statisticDefinitions.filter(definition => definition.specificSubgroup === 'entities').map(definition => stripMinecraftNamespace(definition.key))
  )]

  const [itemIconsByBareId, entityIconsByBareId] = await Promise.all([
    resolveItemIconsByBareId(itemBareIds),
    resolveEntityIconsByBareId(entityBareIds)
  ])

  return { itemIconsByBareId, entityIconsByBareId }
}, minecraftIconBundleCacheOptions)
