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
  scoresVersion: string
  statusVersion: string
}

type ScoredParticipantWithoutCurrentStatus = Omit<ScoredParticipant, 'isOnlineOnMinecraftServer' | 'isLiveOnTwitch' | 'twitchStreamTitle' | 'twitchStreamGame'>

interface ComputedScores extends Omit<Scoreboard, 'participants' | 'statusVersion'> {
  participants: ScoredParticipantWithoutCurrentStatus[]
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

async function computeScores(): Promise<ComputedScores> {
  const [
    participantsResult, statsResult, profileImageUrlsResult, advancementScoreboard,
    vanillaDisplayNamesEn, vanillaDisplayNamesDe
  ] = await Promise.all([
    loadParticipants(),
    loadAllPlayerStats(),
    loadOrFallback(getTwitchProfileImageUrlsByLogin, {}, 'Twitch-Profilbilder konnten nicht abgerufen werden:'),
    computeAdvancementScoreboard(),
    loadVanillaStatisticDisplayNamesByLocale('en'),
    loadVanillaStatisticDisplayNamesByLocale('de')
  ])

  const participants = participantsResult.value
  const statsByMinecraftUuid = statsResult.value
  const profileImageUrlByTwitchLogin = profileImageUrlsResult.value
  // profile pictures are left out: they are cached for an hour and say nothing about how current the shown values are
  const asOf = toOldestFetchedAt([
    participantsResult.fetchedAt,
    statsResult.fetchedAt,
    advancementScoreboard.asOf
  ])

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
    // built from what the scores are computed from, because hashing the finished scores would take several hundred milliseconds
    scoresVersion: buildContentVersion([participants, statsByMinecraftUuid, statisticDefinitions, advancementScoreboard.advancements, profileImageUrlByTwitchLogin]),
    participants: rankedParticipants.map(({ participant, totalScore, rank }) => ({
      participant,
      totalScore,
      rank,
      percentOfLeaderScore: leaderScore === 0 ? 0 : (totalScore / leaderScore) * 100,
      twitchProfileImageUrl: participant.twitchLogin !== null ? profileImageUrlByTwitchLogin[participant.twitchLogin] ?? null : null,
      statistics: (statisticScoresByParticipantId.get(participant.id) ?? []).sort((a, b) => b.pointsWithoutStatisticWeight - a.pointsWithoutStatisticWeight)
    }))
  }
}

// computing the scores blocks the whole server for 100-200 ms and every page and every poll of every open tab needs them, so
// simultaneous requests queued up behind each other for seconds; Minecraft normally writes its stats files only about every
// 5 minutes anyway; expired scores are computed again before answering, for the same reason as FRESH_DATA_CACHE_OPTIONS
const SCORES_REUSE_DURATION_MILLISECONDS = 5 * 60 * 1000
const SCORES_RETRY_DELAY_AFTER_FAILURE_MILLISECONDS = 60 * 1000

let latestScores: ComputedScores | undefined
let nextScoresComputationAt = 0
let pendingScoresComputation: Promise<ComputedScores> | undefined

// a failed computation, for example while participants.toml is being saved, must not take down pages that can still show the last scores
async function computeScoresOrKeepLatest(): Promise<ComputedScores> {
  try {
    latestScores = await computeScores()
    nextScoresComputationAt = Date.now() + SCORES_REUSE_DURATION_MILLISECONDS
    return latestScores
  } catch (error) {
    if (!latestScores) throw error
    nextScoresComputationAt = Date.now() + SCORES_RETRY_DELAY_AFTER_FAILURE_MILLISECONDS
    console.error('Punkte konnten nicht neu berechnet werden, die letzten bleiben bestehen und es wird in einer Minute erneut versucht:', error)
    return latestScores
  }
}

// kept in memory because defineCachedFunction would copy their hundreds of thousands of entries through JSON on every use
async function getRecentlyComputedScores(): Promise<ComputedScores> {
  if (latestScores && Date.now() < nextScoresComputationAt) return latestScores

  pendingScoresComputation ??= computeScoresOrKeepLatest().finally(() => {
    pendingScoresComputation = undefined
  })
  return pendingScoresComputation
}

// online and live status keep their own shorter cache times and are cheap to combine with the scores; all callers share the
// statistics and advancements of the returned scoreboard and must not modify them
export async function getScoreboard(): Promise<Scoreboard> {
  const [scores, onlineStatusResult, liveStreamsResult] = await Promise.all([
    getRecentlyComputedScores(),
    getOnlinePlayerUuids(),
    loadOrFallback(getLiveTwitchStreamsByLogin, {}, 'Twitch-Live-Status konnte nicht abgerufen werden, alle Teilnehmer gelten als nicht live:')
  ])

  const onlinePlayerUuidSet = new Set(onlineStatusResult.value)

  const participants = scores.participants.map((scoredParticipant) => {
    const { twitchLogin, minecraftUuid } = scoredParticipant.participant
    const liveStream = twitchLogin !== null ? liveStreamsResult.value[twitchLogin] : undefined

    return {
      ...scoredParticipant,
      isOnlineOnMinecraftServer: onlinePlayerUuidSet.has(minecraftUuid),
      isLiveOnTwitch: liveStream !== undefined,
      twitchStreamTitle: liveStream?.title ?? null,
      twitchStreamGame: liveStream?.gameName ?? null
    }
  })

  return {
    ...scores,
    asOf: toOldestFetchedAt([scores.asOf, onlineStatusResult.fetchedAt, liveStreamsResult.fetchedAt]),
    statusVersion: buildContentVersion(participants.map(scoredParticipant => [
      scoredParticipant.participant.id,
      scoredParticipant.isOnlineOnMinecraftServer,
      scoredParticipant.twitchStreamTitle,
      scoredParticipant.twitchStreamGame,
      scoredParticipant.isLiveOnTwitch
    ])),
    participants
  }
}
