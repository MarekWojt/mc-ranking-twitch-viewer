interface RawStatisticScore {
  statistic: StatisticDefinition
  value: number
  medianBasedPoints: number
  rank: number
}

export interface ParticipantStatisticScore {
  statistic: StatisticDefinition
  value: number
  points: number
  pointsWithoutStatisticWeight: number
  rank: number
}

export interface ScoredParticipant {
  participant: Participant
  totalScore: number
  rank: number
  percentOfLeaderScore: number
  isOnlineOnMinecraftServer: boolean
  isLiveOnTwitch: boolean
  twitchStreamTitle: string | null
  twitchStreamGame: string | null
  twitchProfileImageUrl: string | null
  statistics: ParticipantStatisticScore[]
}

export interface Scoreboard {
  asOf: string
  statisticDefinitions: StatisticDefinition[]
  participants: ScoredParticipant[]
  advancements: ScoredAdvancement[]
  scoreGroupFactors: PointsByScoreGroup
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
    vanillaDisplayNamesEn, vanillaDisplayNamesDe
  ] = await Promise.all([
    loadParticipants(),
    loadAllPlayerStats(),
    getOnlinePlayerUuids(),
    loadOrFallback(getLiveTwitchStreamsByLogin, {}, 'Twitch-Live-Status konnte nicht abgerufen werden, alle Teilnehmer gelten als nicht live:'),
    loadOrFallback(getTwitchProfileImageUrlsByLogin, {}, 'Twitch-Profilbilder konnten nicht abgerufen werden:'),
    computeAdvancementScoreboard(),
    loadVanillaStatisticDisplayNamesByLocale('en'),
    loadVanillaStatisticDisplayNamesByLocale('de')
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
  const statisticDefinitions = collectStatisticDefinitions(statsByMinecraftUuid, { en: vanillaDisplayNamesEn, de: vanillaDisplayNamesDe })

  getMinecraftIconBundle(statisticDefinitions, advancementScoreboard.advancements.map(scoredAdvancement => scoredAdvancement.definition)).catch((error) => {
    console.error('Vorab-Laden der Minecraft-Icons im Hintergrund fehlgeschlagen:', error)
  })

  const rawStatisticScoresByParticipantId = new Map<string, RawStatisticScore[]>(
    participants.map(participant => [participant.id, []])
  )
  const scoreGroupPointsByParticipantId = new Map<string, ParticipantScoreGroupPoints>(participants.map(participant => [
    participant.id,
    createParticipantScoreGroupPoints(advancementScoreboard.totalPointsByParticipantId[participant.id] ?? 0)
  ]))

  for (const statisticDefinition of statisticDefinitions) {
    const valueByParticipantId = new Map(participants.map(participant => [
      participant.id,
      statsByMinecraftUuid[participant.minecraftUuid]?.[statisticDefinition.category]?.[statisticDefinition.key] ?? 0
    ]))

    const medianValue = calculateMedian([...valueByParticipantId.values()].filter(value => value >= 1))

    const rankByParticipantId = new Map(
      rankByCompetitionRanking(
        participants.map(participant => ({ participantId: participant.id, value: valueByParticipantId.get(participant.id) ?? 0 })),
        entry => entry.value
      ).map(entry => [entry.participantId, entry.rank])
    )

    const scoreGroup = resolveStatisticScoreGroup(statisticDefinition.specificSubgroup)

    for (const participant of participants) {
      const value = valueByParticipantId.get(participant.id) ?? 0
      const medianBasedPoints = calculateStatisticPoints(value, medianValue)
      const rank = rankByParticipantId.get(participant.id)!

      rawStatisticScoresByParticipantId.get(participant.id)?.push({ statistic: statisticDefinition, value, medianBasedPoints, rank })
      addToScoreGroupPoints(scoreGroupPointsByParticipantId.get(participant.id)!, scoreGroup, medianBasedPoints * statisticDefinition.weight)
    }
  }

  const scoreGroupFactors = calculateScoreGroupFactors([...scoreGroupPointsByParticipantId.values()])

  const statisticScoresByParticipantId = new Map<string, ParticipantStatisticScore[]>(participants.map(participant => [
    participant.id,
    (rawStatisticScoresByParticipantId.get(participant.id) ?? []).map((rawStatisticScore) => {
      const scoreGroupFactor = scoreGroupFactors[resolveStatisticScoreGroup(rawStatisticScore.statistic.specificSubgroup)]
      const pointsWithoutStatisticWeight = rawStatisticScore.medianBasedPoints * scoreGroupFactor
      return {
        statistic: rawStatisticScore.statistic,
        value: rawStatisticScore.value,
        points: pointsWithoutStatisticWeight * rawStatisticScore.statistic.weight,
        pointsWithoutStatisticWeight,
        rank: rawStatisticScore.rank
      }
    })
  ]))

  const totalScoreByParticipantId = new Map<string, number>(participants.map((participant) => {
    const statisticPoints = (statisticScoresByParticipantId.get(participant.id) ?? []).reduce((sum, statisticScore) => sum + statisticScore.points, 0)
    const advancementPoints = (advancementScoreboard.totalPointsByParticipantId[participant.id] ?? 0) * scoreGroupFactors.advancements
    return [participant.id, statisticPoints + advancementPoints]
  }))

  const scaledAdvancements = advancementScoreboard.advancements.map(scoredAdvancement => ({
    ...scoredAdvancement,
    points: scoredAdvancement.points * scoreGroupFactors.advancements
  }))

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
    advancements: scaledAdvancements,
    scoreGroupFactors,
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
        twitchStreamGame: liveStream?.gameName ?? null,
        twitchProfileImageUrl: participant.twitchLogin !== null ? profileImageUrlByTwitchLogin[participant.twitchLogin] ?? null : null,
        statistics: (statisticScoresByParticipantId.get(participant.id) ?? []).sort((a, b) => b.pointsWithoutStatisticWeight - a.pointsWithoutStatisticWeight)
      }
    })
  }
}
