export default defineEventHandler(async (): Promise<ParticipantListItemDto[]> => {
  const scoreboard = await computeScoreboard()
  return scoreboard.participants.map(toParticipantListItemDto)
})
