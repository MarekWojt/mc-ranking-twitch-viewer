export default defineEventHandler(async (): Promise<DataWithFreshness<StatisticListItemDto[]>> => {
  const scoreboard = await computeScoreboard()
  return {
    asOf: scoreboard.asOf,
    payload: scoreboard.statisticDefinitions.map(definition => ({
      slug: definition.slug,
      label: definition.label,
      group: definition.group,
      groupLabel: definition.groupLabel
    }))
  }
})
