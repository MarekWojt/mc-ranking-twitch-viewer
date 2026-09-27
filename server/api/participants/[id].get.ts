export default defineEventHandler(async (event): Promise<ParticipantDetailDto> => {
  const participantId = getRouterParam(event, 'id')
  const scoreboard = await computeScoreboard()
  const scoredParticipant = scoreboard.participants.find(entry => entry.participant.id === participantId)

  if (!scoredParticipant) {
    throw createError({ statusCode: 404, statusMessage: 'Teilnehmer nicht gefunden' })
  }

  return toParticipantDetailDto(scoredParticipant)
})
