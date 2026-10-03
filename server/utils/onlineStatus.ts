import { readFile } from 'node:fs/promises'

async function readFileIfExists(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw error
  }
}

const onlineStatusCacheOptions = {
  name: 'minecraft-online-players',
  getKey: () => 'all',
  maxAge: useRuntimeConfig().minecraftOnlineStatusCacheTtlSeconds
}

export const getOnlinePlayerUuids = defineCachedFunction(async (): Promise<TimestampedValue<string[]>> => {
  const { minecraftOnlinePlayersFilePath } = useRuntimeConfig()
  const fileContents = await readFileIfExists(minecraftOnlinePlayersFilePath)
  const onlinePlayerUuids = fileContents === null
    ? []
    : fileContents
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(normalizeMinecraftUuid)

  return { value: onlinePlayerUuids, fetchedAt: new Date().toISOString() }
}, onlineStatusCacheOptions)
