import { createHash } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const STORED_MINECRAFT_ICON_BUNDLE_FILE_PATH = resolve(process.cwd(), '.data/minecraft-icon-bundle.json')
const MINECRAFT_ICON_BUNDLE_MAX_AGE_MILLISECONDS = 24 * 60 * 60 * 1000
const EMPTY_MINECRAFT_ICON_BUNDLE: MinecraftIconBundleDto = { itemIconsByBareId: {}, entityIconsByBareId: {}, advancementIconsBySlug: {} }

interface StoredMinecraftIconBundle {
  builtAt: number
  contentKey: string
  bundle: MinecraftIconBundleDto
}

let storedIconBundle: StoredMinecraftIconBundle | null | undefined
let pendingIconBundleBuild: Promise<StoredMinecraftIconBundle> | undefined

interface MinecraftIconBundleContents {
  itemBareIds: string[]
  entityBareIds: string[]
  advancementDefinitions: AdvancementDefinition[]
}

function collectIconBundleContents(statisticDefinitions: StatisticDefinition[], advancementDefinitions: AdvancementDefinition[]): MinecraftIconBundleContents {
  const collectBareIds = (specificSubgroup: string) => [...new Set(
    statisticDefinitions.filter(definition => definition.specificSubgroup === specificSubgroup).map(definition => stripMinecraftNamespace(definition.key))
  )].sort()
  return { itemBareIds: collectBareIds('items'), entityBareIds: collectBareIds('entities'), advancementDefinitions }
}

function buildContentKey(contents: MinecraftIconBundleContents): string {
  const advancementIds = contents.advancementDefinitions.map(definition => definition.id).sort()
  return createHash('sha256').update(JSON.stringify([contents.itemBareIds, contents.entityBareIds, advancementIds])).digest('hex')
}

async function loadStoredIconBundle(): Promise<StoredMinecraftIconBundle | null> {
  if (storedIconBundle !== undefined) return storedIconBundle
  try {
    storedIconBundle = JSON.parse(await readFile(STORED_MINECRAFT_ICON_BUNDLE_FILE_PATH, 'utf8')) as StoredMinecraftIconBundle
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    storedIconBundle = null
  }
  return storedIconBundle
}

async function buildAndStoreIconBundle(contents: MinecraftIconBundleContents, contentKey: string): Promise<StoredMinecraftIconBundle> {
  const [itemIconsByBareId, entityIconsByBareId, advancementIconsBySlug] = await Promise.all([
    resolveItemIconsByBareId(contents.itemBareIds),
    resolveEntityIconsByBareId(contents.entityBareIds),
    resolveAdvancementIconsBySlug(contents.advancementDefinitions)
  ])
  const builtIconBundle = { builtAt: Date.now(), contentKey, bundle: { itemIconsByBareId, entityIconsByBareId, advancementIconsBySlug } }

  await mkdir(dirname(STORED_MINECRAFT_ICON_BUNDLE_FILE_PATH), { recursive: true })
  const temporaryFilePath = `${STORED_MINECRAFT_ICON_BUNDLE_FILE_PATH}.${process.pid}.tmp`
  await writeFile(temporaryFilePath, JSON.stringify(builtIconBundle))
  await rename(temporaryFilePath, STORED_MINECRAFT_ICON_BUNDLE_FILE_PATH)
  storedIconBundle = builtIconBundle
  return builtIconBundle
}

function buildAndStoreIconBundleOnce(contents: MinecraftIconBundleContents, contentKey: string): Promise<StoredMinecraftIconBundle> {
  pendingIconBundleBuild ??= buildAndStoreIconBundle(contents, contentKey).finally(() => {
    pendingIconBundleBuild = undefined
  })
  return pendingIconBundleBuild
}

// building the bundle queries the Minecraft wiki at a rate-limited pace and takes over a minute, so pages never wait for
// it: they get the stored bundle (or an empty one on the very first start) while a new one is built in the background
export async function getMinecraftIconBundle(statisticDefinitions: StatisticDefinition[], advancementDefinitions: AdvancementDefinition[]): Promise<MinecraftIconBundleDto> {
  const contents = collectIconBundleContents(statisticDefinitions, advancementDefinitions)
  const contentKey = buildContentKey(contents)
  const storedBundle = await loadStoredIconBundle()

  const isStoredBundleCurrent = storedBundle !== null
    && storedBundle.contentKey === contentKey
    && Date.now() - storedBundle.builtAt < MINECRAFT_ICON_BUNDLE_MAX_AGE_MILLISECONDS
  if (!isStoredBundleCurrent) {
    buildAndStoreIconBundleOnce(contents, contentKey).catch((error) => {
      console.error('Minecraft-Icon-Bundle konnte nicht neu gebaut werden, das bisherige bleibt bestehen:', error)
    })
  }

  return storedBundle?.bundle ?? EMPTY_MINECRAFT_ICON_BUNDLE
}
