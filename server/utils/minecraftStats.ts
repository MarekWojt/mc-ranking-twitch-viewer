import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

const STATS_FILENAME_MINECRAFT_UUID_PATTERN = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.json$/i

export async function listMinecraftUuidsWithStatsFiles(): Promise<string[]> {
  const { minecraftStatsDirectoryPath } = useRuntimeConfig()

  try {
    const filenames = await readdir(minecraftStatsDirectoryPath)
    return filenames
      .map(filename => filename.match(STATS_FILENAME_MINECRAFT_UUID_PATTERN)?.[1])
      .filter((minecraftUuid): minecraftUuid is string => minecraftUuid !== undefined)
      .map(normalizeMinecraftUuid)
  } catch (error) {
    console.error('Stats-Verzeichnis konnte nicht nach neuen Teilnehmern durchsucht werden:', error)
    return []
  }
}

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

const minecraftStatsCacheOptions = {
  name: 'minecraft-player-stats',
  getKey: () => 'all',
  maxAge: useRuntimeConfig().minecraftStatsCacheTtlSeconds
}

export const loadAllPlayerStats = defineCachedFunction(async (): Promise<TimestampedValue<Record<string, RawStatisticsByCategory>>> => {
  const { value: participants } = await loadParticipants()
  const statsEntries = await Promise.all(
    participants.map(async participant =>
      [participant.minecraftUuid, await readPlayerStats(participant.minecraftUuid)] as const
    )
  )
  return { value: Object.fromEntries(statsEntries), fetchedAt: new Date().toISOString() }
}, minecraftStatsCacheOptions)
