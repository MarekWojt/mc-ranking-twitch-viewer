export default defineEventHandler(async (event): Promise<ScoredDataWithFreshness<ParticipantDetailDto>> => {
  const participantId = getRouterParam(event, 'id')
  const scoreboard = await computeScoreboard()
  const scoredParticipant = scoreboard.participants.find(entry => entry.participant.id === participantId)

  if (!scoredParticipant) {
    throw createError({ statusCode: 404, statusMessage: 'Teilnehmer nicht gefunden' })
  }

  const participantAdvancements = scoreboard.advancements
    .filter(scoredAdvancement => scoredAdvancement.completedAtByParticipantId[participantId!] !== undefined)
    .sort((a, b) => compareAdvancementsByRarityThenRecency(
      a.points, a.completedAtByParticipantId[participantId!] ?? null,
      b.points, b.completedAtByParticipantId[participantId!] ?? null
    ))
    .map(scoredAdvancement => toParticipantAdvancementRowDto(scoredAdvancement, participantId!))

  return {
    asOf: scoreboard.asOf,
    scoreGroupFactors: scoreboard.scoreGroupFactors,
    payload: toParticipantDetailDto(scoredParticipant, participantAdvancements)
  }
})
