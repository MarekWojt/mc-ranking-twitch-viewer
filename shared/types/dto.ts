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
  twitchStreamTitle: string | null
  twitchStreamGame: string | null
}

export interface ParticipantStatisticRowDto {
  slug: string
  key: string
  category: string
  label: LocalizedLabel
  group: StatisticGroup
  groupLabel: LocalizedLabel | null
  specificSubgroup: SpecificStatisticSubgroup | null
  value: number
  displayValue: string
  points: number
  pointsWithoutStatisticWeight: number
  rank: number
  weight: number
}

export interface ParticipantAdvancementRowDto {
  slug: string
  category: string
  label: LocalizedLabel
  description: LocalizedOptionalText | null
  groupLabel: LocalizedLabel
  points: number
  completedAt: string | null
  completedAtDisplay: string
}

export interface ParticipantDetailDto extends ParticipantListItemDto {
  statistics: ParticipantStatisticRowDto[]
  advancements: ParticipantAdvancementRowDto[]
}

export interface StatisticLeaderDto {
  participantId: string
  displayName: string
  minecraftUuid: string
}

export interface StatisticListItemDto {
  slug: string
  key: string
  category: string
  label: LocalizedLabel
  group: StatisticGroup
  groupLabel: LocalizedLabel | null
  specificSubgroup: SpecificStatisticSubgroup | null
  maxValue: number
  maxDisplayValue: string
  totalValue: number
  totalDisplayValue: string
  leaders: StatisticLeaderDto[]
  weight: number
}

export interface StatisticParticipantRowDto {
  participantId: string
  displayName: string
  minecraftUuid: string
  value: number
  displayValue: string
  points: number
  pointsWithoutStatisticWeight: number
  rank: number
}

export interface StatisticDetailDto {
  slug: string
  label: LocalizedLabel
  group: StatisticGroup
  groupLabel: LocalizedLabel | null
  totalValue: number
  totalDisplayValue: string
  totalPoints: number
  totalPointsWithoutStatisticWeight: number
  participants: StatisticParticipantRowDto[]
  weight: number
}

export interface MinecraftIconBundleDto {
  itemIconsByBareId: Record<string, string>
  entityIconsByBareId: Record<string, string>
  advancementIconsBySlug: Record<string, string>
}

export interface ObjectStatisticParticipantRowDto {
  participantId: string
  displayName: string
  minecraftUuid: string
  valueByCategory: Record<string, number>
  displayValueByCategory: Record<string, string>
  totalValue: number
  pointsByCategory: Record<string, number>
  pointsWithoutStatisticWeightByCategory: Record<string, number>
  totalPoints: number
  rankByCategory: Record<string, number>
}

export interface ObjectStatisticDetailDto {
  objectKey: string
  objectLabel: LocalizedLabel
  categories: string[]
  groupLabelByCategory: Record<string, LocalizedLabel>
  participants: ObjectStatisticParticipantRowDto[]
}

export interface AdvancementListItemDto {
  slug: string
  category: string
  label: LocalizedLabel
  description: LocalizedOptionalText | null
  groupLabel: LocalizedLabel
  participantCount: number
  points: number
  mostRecentCompletedAt: string | null
  mostRecentCompletedAtDisplay: string
}

export interface AdvancementParticipantRowDto {
  participantId: string
  displayName: string
  minecraftUuid: string
  points: number
  completedAt: string | null
  completedAtDisplay: string
}

export interface AdvancementDetailDto {
  slug: string
  label: LocalizedLabel
  description: LocalizedOptionalText | null
  groupLabel: LocalizedLabel
  participantCount: number
  points: number
  participants: AdvancementParticipantRowDto[]
}
