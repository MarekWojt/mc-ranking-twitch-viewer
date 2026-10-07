export default defineEventHandler(async (): Promise<MinecraftIconBundleDto> => {
  const [scoreboard, advancementScoreboard] = await Promise.all([computeScoreboard(), computeAdvancementScoreboard()])
  return buildMinecraftIconBundle(scoreboard.statisticDefinitions, advancementScoreboard.advancements.map(scoredAdvancement => scoredAdvancement.definition))
})
