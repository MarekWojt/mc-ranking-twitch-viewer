const minecraftIconBundleCacheOptions = {
  name: 'minecraft-icon-bundle',
  getKey: () => 'all',
  maxAge: 86400
}

export const buildMinecraftIconBundle = defineCachedFunction(async (statisticDefinitions: StatisticDefinition[], advancementDefinitions: AdvancementDefinition[]): Promise<MinecraftIconBundleDto> => {
  const itemBareIds = [...new Set(
    statisticDefinitions.filter(definition => definition.specificSubgroup === 'items').map(definition => stripMinecraftNamespace(definition.key))
  )]
  const entityBareIds = [...new Set(
    statisticDefinitions.filter(definition => definition.specificSubgroup === 'entities').map(definition => stripMinecraftNamespace(definition.key))
  )]

  const [itemIconsByBareId, entityIconsByBareId, advancementIconsBySlug] = await Promise.all([
    resolveItemIconsByBareId(itemBareIds),
    resolveEntityIconsByBareId(entityBareIds),
    resolveAdvancementIconsBySlug(advancementDefinitions)
  ])

  return { itemIconsByBareId, entityIconsByBareId, advancementIconsBySlug }
}, minecraftIconBundleCacheOptions)
