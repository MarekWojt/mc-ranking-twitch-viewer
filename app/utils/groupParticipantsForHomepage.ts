export interface HomepageParticipantGroups {
  onlineAndLive: ParticipantListItemDto[]
  liveOnly: ParticipantListItemDto[]
  onlineOnly: ParticipantListItemDto[]
  neitherOnlineNorLive: ParticipantListItemDto[]
}

export function groupParticipantsForHomepage(participants: ParticipantListItemDto[]): HomepageParticipantGroups {
  return {
    onlineAndLive: participants.filter(participant => participant.isOnlineOnMinecraftServer && participant.isLiveOnTwitch),
    liveOnly: participants.filter(participant => !participant.isOnlineOnMinecraftServer && participant.isLiveOnTwitch),
    onlineOnly: participants.filter(participant => participant.isOnlineOnMinecraftServer && !participant.isLiveOnTwitch),
    neitherOnlineNorLive: participants.filter(participant => !participant.isOnlineOnMinecraftServer && !participant.isLiveOnTwitch)
  }
}
