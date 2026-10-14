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

export function toParticipantDetailDto(scoredParticipant: ScoredParticipant, advancements: ParticipantAdvancementRowDto[]): ParticipantDetailDto {
  return {
    ...toParticipantListItemDto(scoredParticipant),
    statistics: scoredParticipant.statistics.map(toParticipantStatisticRowDto),
    advancements
  }
}
