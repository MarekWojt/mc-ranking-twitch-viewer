import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'

const MINECRAFT_ICON_CACHE_DIRECTORY = resolve(process.cwd(), '.data/minecraft-icons')
const MINECRAFT_WIKI_USER_AGENT = 'twitch-online-viewer-minecraft-icon-bundle/1.0 (self-hosted community portal; icon bundle rebuilt at most every 10 minutes)'

const minecraftIconRequestQueue = createConcurrencyLimitedQueue(8, 30)

type MinecraftIconDownloadResult
  = | { outcome: 'found', bytes: Buffer }
    | { outcome: 'confirmedMissing' }
    | { outcome: 'temporarilyUnavailable' }

function isNotFoundFetchError(error: unknown): boolean {
  return (error as { response?: { status?: number } })?.response?.status === 404
    || (error as { statusCode?: number })?.statusCode === 404
}

async function readFileIfExists(filePath: string): Promise<Buffer | null> {
  try {
    return await readFile(filePath)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw error
  }
}

async function downloadIconFromUrl(sourceUrl: string): Promise<MinecraftIconDownloadResult> {
  try {
    const arrayBuffer = await $fetch<ArrayBuffer>(sourceUrl, {
      responseType: 'arrayBuffer',
      headers: { 'User-Agent': MINECRAFT_WIKI_USER_AGENT }
    })
    return { outcome: 'found', bytes: Buffer.from(arrayBuffer) }
  } catch (error) {
    if (isNotFoundFetchError(error)) return { outcome: 'confirmedMissing' }
    console.error(`Minecraft-Icon vorübergehend nicht abrufbar, wird nicht dauerhaft als fehlend gemerkt: ${sourceUrl}`, error)
    return { outcome: 'temporarilyUnavailable' }
  }
}

async function resolveCachedIcon(cacheKey: string, sourceUrl: string): Promise<Buffer | null> {
  const localFilePath = join(MINECRAFT_ICON_CACHE_DIRECTORY, cacheKey)
  const missingMarkerFilePath = `${localFilePath}.missing`

  const cachedIconBytes = await readFileIfExists(localFilePath)
  if (cachedIconBytes !== null) return cachedIconBytes

  const missingMarker = await readFileIfExists(missingMarkerFilePath)
  if (missingMarker !== null) return null

  const downloadResult = await downloadIconFromUrl(sourceUrl)

  if (downloadResult.outcome === 'temporarilyUnavailable') return null

  await mkdir(dirname(localFilePath), { recursive: true })

  if (downloadResult.outcome === 'confirmedMissing') {
    await writeFile(missingMarkerFilePath, '')
    return null
  }

  await writeFile(localFilePath, downloadResult.bytes)
  return downloadResult.bytes
}

const inFlightCachedIconRequestsByCacheKey = new Map<string, Promise<Buffer | null>>()

export function getOrDownloadCachedIcon(cacheKey: string, sourceUrl: string): Promise<Buffer | null> {
  const inFlightRequest = inFlightCachedIconRequestsByCacheKey.get(cacheKey)
  if (inFlightRequest) return inFlightRequest

  const request = minecraftIconRequestQueue(() => resolveCachedIcon(cacheKey, sourceUrl))
    .finally(() => inFlightCachedIconRequestsByCacheKey.delete(cacheKey))

  inFlightCachedIconRequestsByCacheKey.set(cacheKey, request)
  return request
}
