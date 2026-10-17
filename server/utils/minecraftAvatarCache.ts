import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'

const MINECRAFT_SKIN_TEXTURE_CACHE_DIRECTORY = resolve(process.cwd(), '.data/minecraft-skin-textures')
const MOJANG_TEXTURE_USER_AGENT = 'twitch-online-viewer-minecraft-avatar-bundle/1.0 (self-hosted community portal)'

const skinTextureDownloadQueue = createConcurrencyLimitedQueue(8, 50)

function cacheKeyForSkinTextureUrl(skinTextureUrl: string): string {
  return createHash('sha256').update(skinTextureUrl).digest('hex')
}

async function readFileIfExists(filePath: string): Promise<Buffer | null> {
  try {
    return await readFile(filePath)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw error
  }
}

async function downloadSkinTextureBytes(skinTextureUrl: string): Promise<Buffer> {
  const localFilePath = join(MINECRAFT_SKIN_TEXTURE_CACHE_DIRECTORY, `${cacheKeyForSkinTextureUrl(skinTextureUrl)}.png`)

  const cachedBytes = await readFileIfExists(localFilePath)
  if (cachedBytes !== null) return cachedBytes

  const arrayBuffer = await $fetch<ArrayBuffer>(skinTextureUrl, {
    responseType: 'arrayBuffer',
    headers: { 'User-Agent': MOJANG_TEXTURE_USER_AGENT }
  })
  const bytes = Buffer.from(arrayBuffer)

  await mkdir(dirname(localFilePath), { recursive: true })
  await writeFile(localFilePath, bytes)
  return bytes
}

export async function isKnownParticipantMinecraftUuid(minecraftUuid: string): Promise<boolean> {
  const { value: participants } = await loadParticipants()
  return participants.some(participant => participant.minecraftUuid === minecraftUuid)
}

export function downloadMinecraftSkinTexture(skinTextureUrl: string): Promise<Buffer> {
  return skinTextureDownloadQueue(() => downloadSkinTextureBytes(skinTextureUrl))
}
