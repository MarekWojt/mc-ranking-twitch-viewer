export function toParticipantListItemDto(scoredParticipant: ScoredParticipant): ParticipantListItemDto {
  return {
    id: scoredParticipant.participant.id,
    displayName: scoredParticipant.participant.displayName,
    minecraftUuid: scoredParticipant.participant.minecraftUuid,
    rank: scoredParticipant.rank,
    totalScore: scoredParticipant.totalScore,
    percentOfLeaderScore: scoredParticipant.percentOfLeaderScore,
    isOnlineOnMinecraftServer: scoredParticipant.isOnlineOnMinecraftServer,
    twitchLogin: scoredParticipant.participant.twitchLogin,
    isLiveOnTwitch: scoredParticipant.isLiveOnTwitch,
    twitchProfileImageUrl: scoredParticipant.twitchProfileImageUrl,
    twitchStreamTitle: scoredParticipant.twitchStreamTitle,
    twitchStreamGame: scoredParticipant.twitchStreamGame
  }
}

export function toParticipantStatisticRowDto(score: ParticipantStatisticScore): ParticipantStatisticRowDto {
  return {
    slug: score.statistic.slug,
    key: score.statistic.key,
    category: score.statistic.category,
    label: score.statistic.label,
    group: score.statistic.group,
    groupLabel: score.statistic.groupLabel,
    specificSubgroup: score.statistic.specificSubgroup,
    value: score.value,
    displayValue: formatStatisticDisplayValue(score.statistic.key, score.value),
    points: score.points,
    pointsWithoutStatisticWeight: score.pointsWithoutStatisticWeight,
    rank: score.rank,
    weight: score.statistic.weight
  }
}

export function toParticipantAdvancementRowDto(scoredAdvancement: ScoredAdvancement, participantId: string): ParticipantAdvancementRowDto {
  const completedAt = scoredAdvancement.completedAtByParticipantId[participantId] ?? null

  return {
    slug: scoredAdvancement.definition.slug,
    category: scoredAdvancement.definition.category,
    label: scoredAdvancement.definition.label,
    description: scoredAdvancement.definition.description,
    groupLabel: scoredAdvancement.definition.groupLabel,
    points: scoredAdvancement.points,
    completedAt,
    completedAtDisplay: formatAdvancementCompletedAt(completedAt)
  }
}

// most rows are item and entity values of 0, which are worth 0 points and appear as a dash whether they are sent or not; leaving
// them out saves up to 70 % of the traffic of every page view and every poll; general statistics are listed even at 0, and the
// table columns come from the rows, so a category without any value keeps one row
function selectStatisticsShownOnParticipantPage(statistics: ParticipantStatisticScore[]): ParticipantStatisticScore[] {
  const categoriesWithValues = new Set(statistics.filter(score => score.value !== 0).map(score => score.statistic.category))
  const emptyCategoriesWithKeptRow = new Set<string>()

  return statistics.filter((score) => {
    if (score.value !== 0 || score.statistic.specificSubgroup === null) return true

    const { category } = score.statistic
    if (categoriesWithValues.has(category) || emptyCategoriesWithKeptRow.has(category)) return false
    emptyCategoriesWithKeptRow.add(category)
    return true
  })
}

export function toParticipantDetailDto(scoredParticipant: ScoredParticipant, advancements: ParticipantAdvancementRowDto[]): ParticipantDetailDto {
  return {
    ...toParticipantListItemDto(scoredParticipant),
    statistics: selectStatisticsShownOnParticipantPage(scoredParticipant.statistics).map(toParticipantStatisticRowDto),
    advancements
  }
}
