export default defineEventHandler(async (event): Promise<MinecraftIconBundleDto | null> => {
  const scoreboard = await computeScoreboard()
  const { bundle, version } = await getMinecraftIconBundle(scoreboard.statisticDefinitions, scoreboard.advancements.map(scoredAdvancement => scoredAdvancement.definition))

  const entityTag = `"${version}"`
  setResponseHeader(event, 'ETag', entityTag)
  // the bundle is around 10 MB, so browsers keep it but check on every use whether a newer one was built
  setResponseHeader(event, 'Cache-Control', 'no-cache')
  if (getRequestHeader(event, 'if-none-match') === entityTag) {
    setResponseStatus(event, 304)
    return null
  }
  return bundle
})
