import { readFile } from 'node:fs/promises'

async function readFileIfExists(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw error
  }
}

const onlineStatusCacheTtlSeconds = useRuntimeConfig().minecraftOnlineStatusCacheTtlSeconds

export const getOnlinePlayerUuids = defineCachedFunction(async (): Promise<string[]> => {
  const { minecraftOnlinePlayersFilePath } = useRuntimeConfig()
  const fileContents = await readFileIfExists(minecraftOnlinePlayersFilePath)
  if (fileContents === null) return []

  return fileContents
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(normalizeMinecraftUuid)
}, {
  name: 'minecraft-online-players',
  getKey: () => 'all',
  maxAge: onlineStatusCacheTtlSeconds
})
