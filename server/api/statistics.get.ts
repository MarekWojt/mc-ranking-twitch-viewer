interface StatisticParticipantScoreEntry {
  participantId: string
  displayName: string
  minecraftUuid: string
  value: number
}

export default defineEventHandler(async (): Promise<DataWithFreshness<StatisticListItemDto[]>> => {
  const scoreboard = await computeScoreboard()

  const scoresBySlug = new Map<string, StatisticParticipantScoreEntry[]>()
  for (const scoredParticipant of scoreboard.participants) {
    for (const score of scoredParticipant.statistics) {
      const scoresForSlug = scoresBySlug.get(score.statistic.slug) ?? []
      scoresForSlug.push({
        participantId: scoredParticipant.participant.id,
        displayName: scoredParticipant.participant.displayName,
        minecraftUuid: scoredParticipant.participant.minecraftUuid,
        value: score.value
      })
      scoresBySlug.set(score.statistic.slug, scoresForSlug)
    }
  }

  return {
    asOf: scoreboard.asOf,
    payload: scoreboard.statisticDefinitions.map((definition): StatisticListItemDto => {
      const scoresForThisStatistic = scoresBySlug.get(definition.slug) ?? []
      const maxValue = Math.max(0, ...scoresForThisStatistic.map(entry => entry.value))
      const leaders = maxValue === 0
        ? []
        : scoresForThisStatistic
            .filter(entry => entry.value === maxValue)
            .map(entry => ({ participantId: entry.participantId, displayName: entry.displayName, minecraftUuid: entry.minecraftUuid }))

      return {
        slug: definition.slug,
        key: definition.key,
        label: definition.label,
        group: definition.group,
        groupLabel: definition.groupLabel,
        specificSubgroup: definition.specificSubgroup,
        maxValue,
        leaders
      }
    })
  }
})
