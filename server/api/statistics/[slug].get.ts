export default defineEventHandler(async (event): Promise<DataWithFreshness<StatisticDetailDto>> => {
  const slug = getRouterParam(event, 'slug')
  const scoreboard = await computeScoreboard()
  const statisticDefinition = scoreboard.statisticDefinitions.find(definition => definition.slug === slug)

  if (!statisticDefinition) {
    throw createError({ statusCode: 404, statusMessage: 'Statistik nicht gefunden' })
  }

  const participantRows = scoreboard.participants
    .map((scoredParticipant): StatisticParticipantRowDto => {
      const score = scoredParticipant.statistics.find(entry => entry.statistic.slug === slug)

      return {
        participantId: scoredParticipant.participant.id,
        displayName: scoredParticipant.participant.displayName,
        minecraftUuid: scoredParticipant.participant.minecraftUuid,
        value: score?.value ?? 0,
        displayValue: formatStatisticDisplayValue(statisticDefinition.key, score?.value ?? 0),
        points: score?.points ?? 0,
        rank: score?.rank ?? scoreboard.participants.length
      }
    })
    .sort((a, b) => b.points - a.points)

  const totalValue = participantRows.reduce((sum, row) => sum + row.value, 0)
  const totalPoints = participantRows.reduce((sum, row) => sum + row.points, 0)

  return {
    asOf: scoreboard.asOf,
    payload: {
      slug: statisticDefinition.slug,
      label: statisticDefinition.label,
      group: statisticDefinition.group,
      groupLabel: statisticDefinition.groupLabel,
      totalValue,
      totalDisplayValue: formatStatisticDisplayValue(statisticDefinition.key, totalValue),
      totalPoints,
      participants: participantRows
    }
  }
})
