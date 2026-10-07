const ADVANCEMENT_RARITY_DECAY_BASE = 0.9
const ADVANCEMENT_MAX_POINTS = 1000 // Faktor 10 ggü. der ursprünglichen Skala, damit die Summe der Advancement-Punkte spürbar (aber nicht dominant) zur Gesamtpunktzahl beiträgt

function calculateAdvancementPoints(participantCount: number): number {
  if (participantCount <= 0) return 0
  return ADVANCEMENT_MAX_POINTS * ADVANCEMENT_RARITY_DECAY_BASE ** (participantCount - 1)
}

export interface ScoredAdvancement {
  definition: AdvancementDefinition
  participantCount: number
  points: number
  completedAtByParticipantId: Record<string, string | null>
}

export interface AdvancementScoreboard {
  asOf: string
  advancements: ScoredAdvancement[]
  participants: Participant[]
  totalPointsByParticipantId: Record<string, number>
}

export function mostRecentAdvancementCompletionTimestamp(scoredAdvancement: ScoredAdvancement): string | null {
  const completionTimestamps = Object.values(scoredAdvancement.completedAtByParticipantId)
    .filter((completedAt): completedAt is string => completedAt !== null)

  return completionTimestamps.length === 0 ? null : completionTimestamps.reduce((latest, timestamp) => timestamp > latest ? timestamp : latest)
}

export function compareAdvancementsByRarityThenRecency(
  pointsA: number, completedAtA: string | null,
  pointsB: number, completedAtB: string | null
): number {
  if (pointsB !== pointsA) return pointsB - pointsA
  if (completedAtA === completedAtB) return 0
  if (completedAtA === null) return 1
  if (completedAtB === null) return -1
  return completedAtB.localeCompare(completedAtA)
}

export async function computeAdvancementScoreboard(): Promise<AdvancementScoreboard> {
  const [participantsResult, advancementsResult, vanillaTextByAdvancementId] = await Promise.all([
    loadParticipants(),
    loadAllPlayerAdvancements(),
    loadVanillaAdvancementTextByAdvancementId()
  ])

  const participants = participantsResult.value
  const completedAdvancementsByMinecraftUuid = advancementsResult.value
  const asOf = toOldestFetchedAt([participantsResult.fetchedAt, advancementsResult.fetchedAt])

  const completedAtByParticipantIdByAdvancementId = new Map<string, Record<string, string | null>>()
  for (const participant of participants) {
    for (const completedAdvancement of completedAdvancementsByMinecraftUuid[participant.minecraftUuid] ?? []) {
      const completedAtByParticipantId = completedAtByParticipantIdByAdvancementId.get(completedAdvancement.id) ?? {}
      completedAtByParticipantId[participant.id] = completedAdvancement.completedAt
      completedAtByParticipantIdByAdvancementId.set(completedAdvancement.id, completedAtByParticipantId)
    }
  }

  const advancements: ScoredAdvancement[] = [...completedAtByParticipantIdByAdvancementId.entries()].map(([advancementId, completedAtByParticipantId]) => {
    const participantCount = Object.keys(completedAtByParticipantId).length
    return {
      definition: buildAdvancementDefinition(advancementId, vanillaTextByAdvancementId),
      participantCount,
      points: calculateAdvancementPoints(participantCount),
      completedAtByParticipantId
    }
  })

  const totalPointsByParticipantId: Record<string, number> = Object.fromEntries(participants.map(participant => [participant.id, 0]))
  for (const scoredAdvancement of advancements) {
    for (const participantId of Object.keys(scoredAdvancement.completedAtByParticipantId)) {
      totalPointsByParticipantId[participantId] = (totalPointsByParticipantId[participantId] ?? 0) + scoredAdvancement.points
    }
  }

  return { asOf, advancements, participants, totalPointsByParticipantId }
}
