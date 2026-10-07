export interface ParticipantStatisticScore {
  statistic: StatisticDefinition
  value: number
  points: number
}

export interface ScoredParticipant {
  participant: Participant
  totalScore: number
  rank: number
  percentOfLeaderScore: number
  isOnlineOnMinecraftServer: boolean
  isLiveOnTwitch: boolean
  twitchStreamTitle: string | null
  twitchProfileImageUrl: string | null
  statistics: ParticipantStatisticScore[]
}

export interface Scoreboard {
  asOf: string
  statisticDefinitions: StatisticDefinition[]
  participants: ScoredParticipant[]
}

export function toOldestFetchedAt(fetchedAtTimestamps: string[]): string {
  return [...fetchedAtTimestamps].sort()[0]!
}

async function loadOrFallback<T>(loadValue: () => Promise<TimestampedValue<T>>, fallbackValue: T, errorMessage: string): Promise<TimestampedValue<T>> {
  try {
    return await loadValue()
  } catch (error) {
    console.error(errorMessage, error)
    return { value: fallbackValue, fetchedAt: new Date().toISOString() }
  }
}

export async function computeScoreboard(): Promise<Scoreboard> {
  const [
    participantsResult, statsResult, onlineStatusResult, liveStreamsResult, profileImageUrlsResult, advancementScoreboard,
    vanillaItemNamesByBareId, vanillaEntityNamesByBareId, vanillaStatisticNamesByKey, vanillaStatisticTypeNamesByKey
  ] = await Promise.all([
    loadParticipants(),
    loadAllPlayerStats(),
    getOnlinePlayerUuids(),
    loadOrFallback(getLiveTwitchStreamsByLogin, {}, 'Twitch-Live-Status konnte nicht abgerufen werden, alle Teilnehmer gelten als nicht live:'),
    loadOrFallback(getTwitchProfileImageUrlsByLogin, {}, 'Twitch-Profilbilder konnten nicht abgerufen werden:'),
    computeAdvancementScoreboard(),
    loadVanillaItemNamesByBareId(),
    loadVanillaEntityNamesByBareId(),
    loadVanillaStatisticNamesByKey(),
    loadVanillaStatisticTypeNamesByKey()
  ])

  const participants = participantsResult.value
  const statsByMinecraftUuid = statsResult.value
  const onlinePlayerUuids = onlineStatusResult.value
  const liveStreamsByTwitchLogin = liveStreamsResult.value
  const profileImageUrlByTwitchLogin = profileImageUrlsResult.value
  const asOf = toOldestFetchedAt([
    participantsResult.fetchedAt,
    statsResult.fetchedAt,
    onlineStatusResult.fetchedAt,
    liveStreamsResult.fetchedAt,
    profileImageUrlsResult.fetchedAt,
    advancementScoreboard.asOf
  ])

  const onlinePlayerUuidSet = new Set(onlinePlayerUuids)
  const statisticDefinitions = collectStatisticDefinitions(statsByMinecraftUuid, {
    itemNamesByBareId: vanillaItemNamesByBareId,
    entityNamesByBareId: vanillaEntityNamesByBareId,
    statisticNamesByKey: vanillaStatisticNamesByKey,
    statisticTypeNamesByKey: vanillaStatisticTypeNamesByKey
  })

  buildMinecraftIconBundle(statisticDefinitions, advancementScoreboard.advancements.map(scoredAdvancement => scoredAdvancement.definition)).catch((error) => {
    console.error('Vorab-Laden der Minecraft-Icons im Hintergrund fehlgeschlagen:', error)
  })

  const statisticScoresByParticipantId = new Map<string, ParticipantStatisticScore[]>(
    participants.map(participant => [participant.id, []])
  )
  const totalScoreByParticipantId = new Map<string, number>(
    participants.map(participant => [participant.id, advancementScoreboard.totalPointsByParticipantId[participant.id] ?? 0])
  )

  for (const statisticDefinition of statisticDefinitions) {
    const valueByParticipantId = new Map(participants.map(participant => [
      participant.id,
      statsByMinecraftUuid[participant.minecraftUuid]?.[statisticDefinition.category]?.[statisticDefinition.key] ?? 0
    ]))

    const medianValue = calculateMedian([...valueByParticipantId.values()].filter(value => value >= 1))

    for (const participant of participants) {
      const value = valueByParticipantId.get(participant.id) ?? 0
      const points = calculateStatisticPoints(value, medianValue)

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

  const leaderScore = rankedParticipants[0]?.totalScore ?? 0

  return {
    asOf,
    statisticDefinitions,
    participants: rankedParticipants.map(({ participant, totalScore, rank }) => {
      const liveStream = participant.twitchLogin !== null ? liveStreamsByTwitchLogin[participant.twitchLogin] : undefined

      return {
        participant,
        totalScore,
        rank,
        percentOfLeaderScore: leaderScore === 0 ? 0 : (totalScore / leaderScore) * 100,
        isOnlineOnMinecraftServer: onlinePlayerUuidSet.has(participant.minecraftUuid),
        isLiveOnTwitch: liveStream !== undefined,
        twitchStreamTitle: liveStream?.title ?? null,
        twitchProfileImageUrl: participant.twitchLogin !== null ? profileImageUrlByTwitchLogin[participant.twitchLogin] ?? null : null,
        statistics: (statisticScoresByParticipantId.get(participant.id) ?? []).sort((a, b) => b.points - a.points)
      }
    })
  }
}
