import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export type RawStatisticValuesByKey = Record<string, number>
export type RawStatisticsByCategory = Record<string, RawStatisticValuesByKey>

interface MinecraftPlayerStatsFile {
  stats?: RawStatisticsByCategory
}

function playerStatsFilePath(minecraftUuid: string): string {
  const { minecraftStatsDirectoryPath } = useRuntimeConfig()
  return join(minecraftStatsDirectoryPath, `${minecraftUuid}.json`)
}

async function readPlayerStats(minecraftUuid: string): Promise<RawStatisticsByCategory> {
  try {
    const fileContents = await readFile(playerStatsFilePath(minecraftUuid), 'utf8')
    const parsedFile = JSON.parse(fileContents) as MinecraftPlayerStatsFile
    return parsedFile.stats ?? {}
  } catch {
    return {}
  }
}

const minecraftStatsCacheTtlSeconds = useRuntimeConfig().minecraftStatsCacheTtlSeconds

export const loadAllPlayerStats = defineCachedFunction(async (): Promise<TimestampedValue<Record<string, RawStatisticsByCategory>>> => {
  const { value: participants } = await loadParticipants()
  const statsEntries = await Promise.all(
    participants.map(async participant =>
      [participant.minecraftUuid, await readPlayerStats(participant.minecraftUuid)] as const
    )
  )
  return { value: Object.fromEntries(statsEntries), fetchedAt: new Date().toISOString() }
}, {
  name: 'minecraft-player-stats',
  getKey: () => 'all',
  maxAge: minecraftStatsCacheTtlSeconds
})
