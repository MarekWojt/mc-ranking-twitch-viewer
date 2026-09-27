export function toParticipantListItemDto(scoredParticipant: ScoredParticipant): ParticipantListItemDto {
  return {
    id: scoredParticipant.participant.id,
    displayName: scoredParticipant.participant.displayName,
    minecraftUuid: scoredParticipant.participant.minecraftUuid,
    rank: scoredParticipant.rank,
    totalScore: scoredParticipant.totalScore,
    isOnlineOnMinecraftServer: scoredParticipant.isOnlineOnMinecraftServer,
    twitchLogin: scoredParticipant.participant.twitchLogin,
    isLiveOnTwitch: scoredParticipant.isLiveOnTwitch,
    twitchProfileImageUrl: scoredParticipant.twitchProfileImageUrl
  }
}

export function toParticipantStatisticRowDto(score: ParticipantStatisticScore): ParticipantStatisticRowDto {
  return {
    slug: score.statistic.slug,
    label: score.statistic.label,
    group: score.statistic.group,
    groupLabel: score.statistic.groupLabel,
    value: score.value,
    displayValue: formatStatisticDisplayValue(score.statistic.key, score.value),
    points: score.points
  }
}

export function toParticipantDetailDto(scoredParticipant: ScoredParticipant): ParticipantDetailDto {
  return {
    ...toParticipantListItemDto(scoredParticipant),
    twitchStreamTitle: scoredParticipant.twitchStreamTitle,
    statistics: scoredParticipant.statistics.map(toParticipantStatisticRowDto)
  }
}
