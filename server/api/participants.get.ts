export default defineEventHandler(async (): Promise<DataWithFreshness<ParticipantListItemDto[]>> => {
  const scoreboard = await computeScoreboard()
  return { asOf: scoreboard.asOf, payload: scoreboard.participants.map(toParticipantListItemDto) }
})
