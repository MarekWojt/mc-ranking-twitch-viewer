export default defineEventHandler(async (event): Promise<StatisticDetailDto> => {
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
        value: score?.value ?? 0,
        displayValue: formatStatisticDisplayValue(statisticDefinition.key, score?.value ?? 0),
        points: score?.points ?? 0
      }
    })
    .sort((a, b) => b.points - a.points)

  return {
    slug: statisticDefinition.slug,
    label: statisticDefinition.label,
    group: statisticDefinition.group,
    groupLabel: statisticDefinition.groupLabel,
    participants: participantRows
  }
})
