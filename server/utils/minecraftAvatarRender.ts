import { createHash } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'

const MINECRAFT_SKIN_RECORD_DIRECTORY = resolve(process.cwd(), '.data/minecraft-skins')
const MINECRAFT_AVATAR_RENDER_DIRECTORY = resolve(process.cwd(), '.data/minecraft-avatar-renders')
// renders are stored by skin content and reused forever, so a change to the renderer's output needs a new version
const MINECRAFT_AVATAR_RENDERER_VERSION = 1
const MINECRAFT_AVATAR_RENDER_KINDS: MinecraftAvatarRenderKind[] = ['body', 'head', 'avatar']

interface MinecraftSkinRecord {
  skinTextureUrl: string
  isSlimModel: boolean
}

export interface MinecraftAvatarRender {
  pngBytes: Buffer
  renderId: string
}

const currentSkinRecordByUuid = new Map<string, MinecraftSkinRecord>()
const pendingSkinRefreshByUuid = new Map<string, Promise<MinecraftSkinRecord | null>>()
const pendingRenderById = new Map<string, Promise<Buffer>>()

async function readFileIfExists(filePath: string): Promise<Buffer | null> {
  try {
    return await readFile(filePath)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw error
  }
}

async function writeFileAtomically(filePath: string, contents: Buffer | string) {
  await mkdir(dirname(filePath), { recursive: true })
  const temporaryFilePath = `${filePath}.${process.pid}.tmp`
  await writeFile(temporaryFilePath, contents)
  await rename(temporaryFilePath, filePath)
}

function skinRecordFilePath(minecraftUuid: string): string {
  return join(MINECRAFT_SKIN_RECORD_DIRECTORY, `${minecraftUuid}.json`)
}

function isSameSkin(skinRecord: MinecraftSkinRecord, otherSkinRecord: MinecraftSkinRecord): boolean {
  return skinRecord.skinTextureUrl === otherSkinRecord.skinTextureUrl && skinRecord.isSlimModel === otherSkinRecord.isSlimModel
}

function buildRenderId(skinRecord: MinecraftSkinRecord, kind: MinecraftAvatarRenderKind): string {
  const skinTextureHash = createHash('sha256').update(skinRecord.skinTextureUrl).digest('hex').slice(0, 24)
  return `${skinTextureHash}-${skinRecord.isSlimModel ? 'slim' : 'classic'}-${kind}-r${MINECRAFT_AVATAR_RENDERER_VERSION}`
}

function renderMinecraftAvatarByKind(kind: MinecraftAvatarRenderKind, skinBytes: Buffer, isSlimModel: boolean): Promise<Buffer> {
  if (kind === 'body') return renderMinecraftBody(skinBytes, isSlimModel)
  if (kind === 'head') return renderMinecraftHead(skinBytes, isSlimModel)
  return renderMinecraftAvatarIcon(skinBytes)
}

async function loadOrRenderAvatar(skinRecord: MinecraftSkinRecord, kind: MinecraftAvatarRenderKind): Promise<Buffer> {
  const renderFilePath = join(MINECRAFT_AVATAR_RENDER_DIRECTORY, `${buildRenderId(skinRecord, kind)}.png`)
  const storedRender = await readFileIfExists(renderFilePath)
  if (storedRender !== null) return storedRender

  const skinBytes = await downloadMinecraftSkinTexture(skinRecord.skinTextureUrl)
  const renderedBytes = await renderMinecraftAvatarByKind(kind, skinBytes, skinRecord.isSlimModel)
  await writeFileAtomically(renderFilePath, renderedBytes)
  return renderedBytes
}

function loadOrRenderAvatarOnce(skinRecord: MinecraftSkinRecord, kind: MinecraftAvatarRenderKind): Promise<Buffer> {
  const renderId = buildRenderId(skinRecord, kind)
  let pendingRender = pendingRenderById.get(renderId)
  if (!pendingRender) {
    pendingRender = loadOrRenderAvatar(skinRecord, kind).finally(() => pendingRenderById.delete(renderId))
    pendingRenderById.set(renderId, pendingRender)
  }
  return pendingRender
}

async function loadStoredSkinRecord(minecraftUuid: string): Promise<MinecraftSkinRecord | null> {
  const cachedSkinRecord = currentSkinRecordByUuid.get(minecraftUuid)
  if (cachedSkinRecord) return cachedSkinRecord

  const storedFileContents = await readFileIfExists(skinRecordFilePath(minecraftUuid))
  if (storedFileContents === null) return null

  const storedSkinRecord = JSON.parse(storedFileContents.toString('utf8')) as MinecraftSkinRecord
  currentSkinRecordByUuid.set(minecraftUuid, storedSkinRecord)
  return storedSkinRecord
}

async function refreshSkinRecord(minecraftUuid: string): Promise<MinecraftSkinRecord | null> {
  const latestSkinInfo = await resolveMinecraftSkinInfo(minecraftUuid)
  const currentSkinRecord = await loadStoredSkinRecord(minecraftUuid)
  if (latestSkinInfo === null) return currentSkinRecord

  const latestSkinRecord: MinecraftSkinRecord = { skinTextureUrl: latestSkinInfo.skinTextureUrl, isSlimModel: latestSkinInfo.isSlimModel }
  if (currentSkinRecord && isSameSkin(currentSkinRecord, latestSkinRecord)) return currentSkinRecord

  // every view is rendered before switching, so visitors keep getting the previous skin until the new one is complete
  await Promise.all(MINECRAFT_AVATAR_RENDER_KINDS.map(kind => loadOrRenderAvatarOnce(latestSkinRecord, kind)))
  await writeFileAtomically(skinRecordFilePath(minecraftUuid), JSON.stringify(latestSkinRecord))
  currentSkinRecordByUuid.set(minecraftUuid, latestSkinRecord)
  return latestSkinRecord
}

function refreshSkinRecordOnce(minecraftUuid: string): Promise<MinecraftSkinRecord | null> {
  let pendingRefresh = pendingSkinRefreshByUuid.get(minecraftUuid)
  if (!pendingRefresh) {
    pendingRefresh = refreshSkinRecord(minecraftUuid).finally(() => pendingSkinRefreshByUuid.delete(minecraftUuid))
    pendingSkinRefreshByUuid.set(minecraftUuid, pendingRefresh)
  }
  return pendingRefresh
}

export async function getMinecraftAvatarRender(minecraftUuid: string, kind: MinecraftAvatarRenderKind): Promise<MinecraftAvatarRender | null> {
  if (!(await isKnownParticipantMinecraftUuid(minecraftUuid))) {
    console.error(`Minecraft-Avatar-Anfrage für unbekannte UUID abgelehnt, Person ist nicht in participants.toml gelistet: ${minecraftUuid}`)
    return null
  }

  const storedSkinRecord = await loadStoredSkinRecord(minecraftUuid)
  const skinRefresh = refreshSkinRecordOnce(minecraftUuid)
  let skinRecord = storedSkinRecord
  if (storedSkinRecord) {
    skinRefresh.catch((error) => {
      console.error(`Skin von ${minecraftUuid} konnte nicht aktualisiert werden, der bisherige bleibt bestehen:`, error)
    })
  } else {
    skinRecord = await skinRefresh
  }
  if (!skinRecord) return null

  return { pngBytes: await loadOrRenderAvatarOnce(skinRecord, kind), renderId: buildRenderId(skinRecord, kind) }
}
