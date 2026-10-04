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

export interface StatisticLeaderDto {
  participantId: string
  displayName: string
  minecraftUuid: string
}

export interface StatisticListItemDto {
  slug: string
  key: string
  label: string
  group: StatisticGroup
  groupLabel: string | null
  specificSubgroup: SpecificStatisticSubgroup | null
  maxValue: number
  maxDisplayValue: string
  totalValue: number
  totalDisplayValue: string
  leaders: StatisticLeaderDto[]
}

export interface StatisticParticipantRowDto {
  participantId: string
  displayName: string
  minecraftUuid: string
  value: number
  displayValue: string
  points: number
}

export interface StatisticDetailDto {
  slug: string
  label: string
  group: StatisticGroup
  groupLabel: string | null
  totalValue: number
  totalDisplayValue: string
  totalPoints: number
  participants: StatisticParticipantRowDto[]
}

export interface MinecraftIconBundleDto {
  itemIconsByBareId: Record<string, string>
  entityIconsByBareId: Record<string, string>
}

export interface ObjectStatisticParticipantRowDto {
  participantId: string
  displayName: string
  minecraftUuid: string
  valueByActionLabel: Record<string, number>
  displayValueByActionLabel: Record<string, string>
  totalValue: number
}

export interface ObjectStatisticDetailDto {
  objectKey: string
  objectLabel: string
  participants: ObjectStatisticParticipantRowDto[]
}
