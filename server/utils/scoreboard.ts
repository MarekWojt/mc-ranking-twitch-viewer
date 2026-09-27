export interface ParticipantStatisticScore {
  statistic: StatisticDefinition
  value: number
  points: number
}

export interface ScoredParticipant {
  participant: Participant
  totalScore: number
  rank: number
  isOnlineOnMinecraftServer: boolean
  isLiveOnTwitch: boolean
  twitchStreamTitle: string | null
  statistics: ParticipantStatisticScore[]
}

export interface Scoreboard {
  asOf: string
  statisticDefinitions: StatisticDefinition[]
  participants: ScoredParticipant[]
}

function toOldestFetchedAt(fetchedAtTimestamps: string[]): string {
  return [...fetchedAtTimestamps].sort()[0]!
}

export async function computeScoreboard(): Promise<Scoreboard> {
  const [participantsResult, statsResult, onlineStatusResult, liveStreamsResult] = await Promise.all([
    loadParticipants(),
    loadAllPlayerStats(),
    getOnlinePlayerUuids(),
    getLiveTwitchStreamsByLogin()
  ])

  const participants = participantsResult.value
  const statsByMinecraftUuid = statsResult.value
  const onlinePlayerUuids = onlineStatusResult.value
  const liveStreamsByTwitchLogin = liveStreamsResult.value
  const asOf = toOldestFetchedAt([
    participantsResult.fetchedAt,
    statsResult.fetchedAt,
    onlineStatusResult.fetchedAt,
    liveStreamsResult.fetchedAt
  ])

  const onlinePlayerUuidSet = new Set(onlinePlayerUuids)
  const statisticDefinitions = collectStatisticDefinitions(statsByMinecraftUuid)

  const statisticScoresByParticipantId = new Map<string, ParticipantStatisticScore[]>(
    participants.map(participant => [participant.id, []])
  )
  const totalScoreByParticipantId = new Map<string, number>(
    participants.map(participant => [participant.id, 0])
  )

  for (const statisticDefinition of statisticDefinitions) {
    const valueByParticipantId = new Map(participants.map(participant => [
      participant.id,
      statsByMinecraftUuid[participant.minecraftUuid]?.[statisticDefinition.category]?.[statisticDefinition.key] ?? 0
    ]))

    const maxValue = Math.max(...valueByParticipantId.values())

    for (const participant of participants) {
      const value = valueByParticipantId.get(participant.id) ?? 0
      const points = maxValue === 0 ? 0 : (value / maxValue) * 100

      statisticScoresByParticipantId.get(participant.id)?.push({ statistic: statisticDefinition, value, points })
      totalScoreByParticipantId.set(participant.id, (totalScoreByParticipantId.get(participant.id) ?? 0) + points)
    }
  }

  const rankedParticipants = rankByCompetitionRanking(
    participants.map(participant => ({
      participant,
      totalScore: totalScoreByParticipantId.get(participant.id) ?? 0
    })),
    entry => entry.totalScore
  )

  return {
    asOf,
    statisticDefinitions,
    participants: rankedParticipants.map(({ participant, totalScore, rank }) => {
      const liveStream = participant.twitchLogin !== null ? liveStreamsByTwitchLogin[participant.twitchLogin] : undefined

      return {
        participant,
        totalScore,
        rank,
        isOnlineOnMinecraftServer: onlinePlayerUuidSet.has(participant.minecraftUuid),
        isLiveOnTwitch: liveStream !== undefined,
        twitchStreamTitle: liveStream?.title ?? null,
        statistics: (statisticScoresByParticipantId.get(participant.id) ?? []).sort((a, b) => b.points - a.points)
      }
    })
  }
}
