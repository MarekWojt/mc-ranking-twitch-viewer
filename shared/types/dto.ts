export interface ParticipantListItemDto {
  id: string
  displayName: string
  minecraftUuid: string
  rank: number
  totalScore: number
  percentOfLeaderScore: number
  isOnlineOnMinecraftServer: boolean
  twitchLogin: string | null
  isLiveOnTwitch: boolean
  twitchProfileImageUrl: string | null
}

export interface ParticipantStatisticRowDto {
  slug: string
  label: string
  group: StatisticGroup
  groupLabel: string | null
  value: number
  displayValue: string
  points: number
}

export interface ParticipantDetailDto extends ParticipantListItemDto {
  twitchStreamTitle: string | null
  statistics: ParticipantStatisticRowDto[]
}

export interface StatisticListItemDto {
  slug: string
  label: string
  group: StatisticGroup
  groupLabel: string | null
}

export interface StatisticParticipantRowDto {
  participantId: string
  displayName: string
  value: number
  displayValue: string
  points: number
}

export interface StatisticDetailDto {
  slug: string
  label: string
  group: StatisticGroup
  groupLabel: string | null
  participants: StatisticParticipantRowDto[]
}
