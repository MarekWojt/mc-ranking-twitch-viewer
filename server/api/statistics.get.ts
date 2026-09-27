export default defineEventHandler(async (): Promise<StatisticListItemDto[]> => {
  const scoreboard = await computeScoreboard()
  return scoreboard.statisticDefinitions.map(definition => ({
    slug: definition.slug,
    label: definition.label,
    group: definition.group,
    groupLabel: definition.groupLabel
  }))
})
