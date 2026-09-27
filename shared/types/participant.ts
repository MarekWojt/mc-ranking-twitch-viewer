export interface ParticipantConfigEntry {
  id?: string
  displayName?: string
  minecraftUuid?: string
  minecraftName?: string
  twitchLogin?: string
}

export interface Participant {
  id: string
  displayName: string
  minecraftUuid: string
  twitchLogin: string | null
}
