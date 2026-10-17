export default defineEventHandler(async (): Promise<MinecraftIconBundleDto> => {
  const scoreboard = await computeScoreboard()
  return getMinecraftIconBundle(scoreboard.statisticDefinitions, scoreboard.advancements.map(scoredAdvancement => scoredAdvancement.definition))
})
