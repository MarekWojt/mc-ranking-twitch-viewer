export default defineEventHandler(async (event): Promise<MinecraftIconBundleDto | null> => {
  const scoreboard = await getScoreboard()
  const { bundle, version } = await getMinecraftIconBundle(scoreboard.statisticDefinitions, scoreboard.advancements.map(scoredAdvancement => scoredAdvancement.definition))

  const entityTag = `"${version}"`
  setResponseHeader(event, 'ETag', entityTag)
  // the bundle is over 1 MB, so browsers keep it but check on every use whether its icons changed
  setResponseHeader(event, 'Cache-Control', 'no-cache')
  // the production proxy compresses this response and thereby weakens the ETag, so browsers send it back as W/"..."
  if (getRequestHeader(event, 'if-none-match')?.replace(/^W\//, '') === entityTag) {
    setResponseStatus(event, 304)
    return null
  }
  return { ...bundle, version }
})
