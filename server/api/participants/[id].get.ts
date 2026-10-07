export default defineEventHandler(async (event): Promise<DataWithFreshness<ParticipantDetailDto>> => {
  const participantId = getRouterParam(event, 'id')
  const [scoreboard, advancementScoreboard] = await Promise.all([computeScoreboard(), computeAdvancementScoreboard()])
  const scoredParticipant = scoreboard.participants.find(entry => entry.participant.id === participantId)

  if (!scoredParticipant) {
    throw createError({ statusCode: 404, statusMessage: 'Teilnehmer nicht gefunden' })
  }

  const participantAdvancements = advancementScoreboard.advancements
    .filter(scoredAdvancement => scoredAdvancement.completedAtByParticipantId[participantId!] !== undefined)
    .sort((a, b) => compareAdvancementsByRarityThenRecency(
      a.points, a.completedAtByParticipantId[participantId!] ?? null,
      b.points, b.completedAtByParticipantId[participantId!] ?? null
    ))
    .map(scoredAdvancement => toParticipantAdvancementRowDto(scoredAdvancement, participantId!))

  return {
    asOf: toOldestFetchedAt([scoreboard.asOf, advancementScoreboard.asOf]),
    payload: toParticipantDetailDto(scoredParticipant, participantAdvancements)
  }
})
