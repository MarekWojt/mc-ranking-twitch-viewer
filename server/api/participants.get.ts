export default defineEventHandler(async (): Promise<DataWithFreshness<ParticipantListItemDto[]>> => {
  const scoreboard = await getScoreboard()
  return {
    asOf: scoreboard.asOf,
    dataVersions: { scores: scoreboard.scoresVersion, status: scoreboard.statusVersion },
    payload: scoreboard.participants.map(toParticipantListItemDto)
  }
})
