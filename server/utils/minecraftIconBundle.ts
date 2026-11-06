import { createHash } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const STORED_MINECRAFT_ICON_BUNDLE_FILE_PATH = resolve(process.cwd(), '.data/minecraft-icon-bundle.json')
const MINECRAFT_ICON_BUNDLE_MAX_AGE_MILLISECONDS = 24 * 60 * 60 * 1000

type MinecraftIcons = Omit<MinecraftIconBundleDto, 'version'>

const EMPTY_MINECRAFT_ICONS: MinecraftIcons = { itemIconsByBareId: {}, entityIconsByBareId: {}, advancementIconsBySlug: {} }
const VERSION_OF_EMPTY_MINECRAFT_ICONS = 'empty'

interface MinecraftIconBundleFile {
  builtAt: number
  contentKey: string
  bundle: MinecraftIcons
}

interface StoredMinecraftIconBundle extends MinecraftIconBundleFile {
  version: string
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

// part of the content key so that a bundle stored in an older format is rebuilt right after a deploy instead of up to a day later
const MINECRAFT_ICON_BUNDLE_FORMAT = 'animated-icons-as-urls'

function buildContentKey(contents: MinecraftIconBundleContents): string {
  const advancementIds = contents.advancementDefinitions.map(definition => definition.id).sort()
  return createHash('sha256').update(JSON.stringify([MINECRAFT_ICON_BUNDLE_FORMAT, contents.itemBareIds, contents.entityBareIds, advancementIds])).digest('hex')
}

function computeIconsVersion({ itemIconsByBareId, entityIconsByBareId, advancementIconsBySlug }: MinecraftIcons): string {
  // sorted because the order of the icons depends on the order in which participants and their files are read
  const sortedIconEntries = [itemIconsByBareId, entityIconsByBareId, advancementIconsBySlug]
    .map(icons => Object.entries(icons).sort(([keyA], [keyB]) => keyA < keyB ? -1 : 1))
  return buildContentVersion(sortedIconEntries)
}

function withIconsVersion(iconBundleFile: MinecraftIconBundleFile): StoredMinecraftIconBundle {
  return { ...iconBundleFile, version: computeIconsVersion(iconBundleFile.bundle) }
}

async function loadStoredIconBundle(): Promise<StoredMinecraftIconBundle | null> {
  if (storedIconBundle !== undefined) return storedIconBundle
  try {
    storedIconBundle = withIconsVersion(JSON.parse(await readFile(STORED_MINECRAFT_ICON_BUNDLE_FILE_PATH, 'utf8')) as MinecraftIconBundleFile)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    storedIconBundle = null
  }
  return storedIconBundle
}

// a wiki request failing during a build must not take away an icon that is still needed, which would also make every browser
// download the bundle twice; icons of objects that no longer appear in the stats are dropped
function collectRequestedIcons(requestedKeys: string[], builtIcons: Record<string, string>, previousIcons: Record<string, string>): Record<string, string> {
  const requestedIcons: Record<string, string> = {}
  for (const key of requestedKeys) {
    const iconSrc = builtIcons[key] ?? previousIcons[key]
    if (iconSrc !== undefined) requestedIcons[key] = iconSrc
  }
  return requestedIcons
}

async function buildAndStoreIconBundle(contents: MinecraftIconBundleContents, contentKey: string): Promise<StoredMinecraftIconBundle> {
  const [itemIconsByBareId, entityIconsByBareId, advancementIconsBySlug] = await Promise.all([
    resolveItemIconsByBareId(contents.itemBareIds),
    resolveEntityIconsByBareId(contents.entityBareIds),
    resolveAdvancementIconsBySlug(contents.advancementDefinitions)
  ])
  const previousIcons = (await loadStoredIconBundle())?.bundle ?? EMPTY_MINECRAFT_ICONS
  const builtIconBundleFile: MinecraftIconBundleFile = {
    builtAt: Date.now(),
    contentKey,
    bundle: {
      itemIconsByBareId: collectRequestedIcons(contents.itemBareIds, itemIconsByBareId, previousIcons.itemIconsByBareId),
      entityIconsByBareId: collectRequestedIcons(contents.entityBareIds, entityIconsByBareId, previousIcons.entityIconsByBareId),
      advancementIconsBySlug: collectRequestedIcons(contents.advancementDefinitions.map(definition => definition.slug), advancementIconsBySlug, previousIcons.advancementIconsBySlug)
    }
  }

  await mkdir(dirname(STORED_MINECRAFT_ICON_BUNDLE_FILE_PATH), { recursive: true })
  const temporaryFilePath = `${STORED_MINECRAFT_ICON_BUNDLE_FILE_PATH}.${process.pid}.tmp`
  await writeFile(temporaryFilePath, JSON.stringify(builtIconBundleFile))
  await rename(temporaryFilePath, STORED_MINECRAFT_ICON_BUNDLE_FILE_PATH)
  storedIconBundle = withIconsVersion(builtIconBundleFile)
  return storedIconBundle
}

function buildAndStoreIconBundleOnce(contents: MinecraftIconBundleContents, contentKey: string): Promise<StoredMinecraftIconBundle> {
  pendingIconBundleBuild ??= buildAndStoreIconBundle(contents, contentKey).finally(() => {
    pendingIconBundleBuild = undefined
  })
  return pendingIconBundleBuild
}

// building the bundle queries the Minecraft wiki at a rate-limited pace and takes over a minute, so pages never wait for
// it: they get the stored bundle (or an empty one on the very first start) while a new one is built in the background
export interface VersionedMinecraftIconBundle {
  bundle: MinecraftIcons
  version: string
}

export async function getMinecraftIconBundle(statisticDefinitions: StatisticDefinition[], advancementDefinitions: AdvancementDefinition[]): Promise<VersionedMinecraftIconBundle> {
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

  return storedBundle
    ? { bundle: storedBundle.bundle, version: storedBundle.version }
    : { bundle: EMPTY_MINECRAFT_ICONS, version: VERSION_OF_EMPTY_MINECRAFT_ICONS }
}

export async function getStoredMinecraftIconBundleVersion(): Promise<string> {
  return (await loadStoredIconBundle())?.version ?? VERSION_OF_EMPTY_MINECRAFT_ICONS
}
