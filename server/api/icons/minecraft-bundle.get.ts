export default defineEventHandler(async (): Promise<MinecraftIconBundleDto> => {
  const scoreboard = await computeScoreboard()
  return buildMinecraftIconBundle(scoreboard.statisticDefinitions)
})
