const MINECRAFT_WIKI_API_URL = 'https://minecraft.wiki/api.php'
const MINECRAFT_ENTITY_ICON_THUMBNAIL_SIZE = 64
const MINECRAFT_WIKI_USER_AGENT = 'twitch-online-viewer-minecraft-icon-bundle/1.0 (self-hosted community portal; icon bundle rebuilt at most every 10 minutes)'

const LOWERCASE_WIKI_TITLE_WORDS = new Set(['of', 'the', 'in', 'on', 'and', 'with', 'a', 'an', 'to'])

const ITEM_BARE_ID_ALIASES: Record<string, string> = {
  piston_head: 'piston',
  redstone_wire: 'redstone',
  tripwire: 'string',
  carrots: 'carrot',
  potatoes: 'potato',
  filled_map: 'map'
}

const ITEM_WIKI_FILE_NAME_OVERRIDES: Record<string, string> = {
  comparator: 'Invicon Redstone Comparator.png',
  deepslate_lapis_ore: 'Invicon Deepslate Lapis Lazuli Ore.png',
  lapis_ore: 'Invicon Lapis Lazuli Ore.png',
  dragon_breath: 'Invicon Dragon\'s Breath.png',
  ender_eye: 'Invicon Eye of Ender.png',
  experience_bottle: 'Invicon Bottle o\' Enchanting.gif',
  hay_block: 'Invicon Hay Bale.png',
  jack_o_lantern: 'Invicon Jack o\'Lantern.png',
  leather_chestplate: 'Invicon Leather Tunic.png',
  leather_helmet: 'Invicon Leather Cap.png',
  leather_leggings: 'Invicon Leather Pants.png',
  lingering_potion: 'Invicon Lingering Water Bottle.png',
  netherite_upgrade_smithing_template: 'Invicon Netherite Upgrade.png',
  potion: 'Invicon Water Bottle.png',
  quartz: 'Invicon Nether Quartz.png',
  rabbit_foot: 'Invicon Rabbit\'s Foot.png',
  repeater: 'Invicon Redstone Repeater.png',
  slime_ball: 'Invicon Slimeball.png',
  spawner: 'Invicon Monster Spawner.png',
  splash_potion: 'Invicon Splash Water Bottle.png',
  tipped_arrow: 'Invicon Uncraftable Tipped Arrow.png',
  vine: 'Invicon Vines.png',
  writable_book: 'Invicon Book and Quill.png'
}

const RAW_MEAT_ITEM_BARE_IDS = new Set(['beef', 'chicken', 'cod', 'mutton', 'porkchop', 'rabbit', 'salmon'])
const BUCKETED_MOB_ITEM_BARE_IDS = new Set(['axolotl', 'pufferfish', 'tadpole'])
const BLOCK_OF_RESOURCE_WORD_OVERRIDES: Record<string, string> = { lapis: 'Lapis Lazuli' }

interface WikiImageInfo {
  url: string
}

interface WikiPage {
  title: string
  imageinfo?: WikiImageInfo[]
}

interface WikiRedirect {
  from: string
  to: string
}

interface WikiQueryResponse {
  query?: {
    pages?: Record<string, WikiPage>
    redirects?: WikiRedirect[]
  }
}

interface WikiPageImage {
  source: string
}

interface WikiPageImagePage {
  title: string
  thumbnail?: WikiPageImage
}

interface WikiPageImageQueryResponse {
  query?: {
    pages?: Record<string, WikiPageImagePage>
    redirects?: WikiRedirect[]
  }
}

function humanizeToWikiTitleCase(bareId: string): string {
  return bareId.split('_').map((word, index) => {
    if (index > 0 && LOWERCASE_WIKI_TITLE_WORDS.has(word)) return word
    return word.charAt(0).toUpperCase() + word.slice(1)
  }).join(' ')
}

function toKebabCase(bareId: string): string {
  return bareId.replace(/_/g, '-')
}

function collectEquivalentItemBareIds(bareId: string): string[] {
  const equivalents = new Set<string>([bareId])

  const wallSignMatch = bareId.match(/^(.+)_wall_sign$/)
  if (wallSignMatch) equivalents.add(`${wallSignMatch[1]}_sign`)
  const wallHangingSignMatch = bareId.match(/^(.+)_wall_hanging_sign$/)
  if (wallHangingSignMatch) equivalents.add(`${wallHangingSignMatch[1]}_hanging_sign`)
  const wallBannerMatch = bareId.match(/^(.+)_wall_banner$/)
  if (wallBannerMatch) equivalents.add(`${wallBannerMatch[1]}_banner`)
  const wallFanMatch = bareId.match(/^(.+)_wall_fan$/)
  if (wallFanMatch) equivalents.add(`${wallFanMatch[1]}_fan`)
  const wallSkullMatch = bareId.match(/^(.+)_wall_skull$/)
  if (wallSkullMatch) equivalents.add(`${wallSkullMatch[1]}_skull`)
  const wallHeadMatch = bareId.match(/^(.+)_wall_head$/)
  if (wallHeadMatch) equivalents.add(`${wallHeadMatch[1]}_head`)
  const wallTorchMatch = bareId.match(/^(.*?_)?wall_torch$/)
  if (wallTorchMatch) equivalents.add(`${wallTorchMatch[1] ?? ''}torch`)

  const waxedMatch = bareId.match(/^waxed_(.+)$/)
  if (waxedMatch) equivalents.add(waxedMatch[1]!)

  const pottedMatch = bareId.match(/^potted_(.+)$/)
  if (pottedMatch) equivalents.add(pottedMatch[1]!)

  const directAlias = ITEM_BARE_ID_ALIASES[bareId]
  if (directAlias) equivalents.add(directAlias)

  return [...equivalents]
}

function buildItemWikiFileNameCandidates(bareId: string): string[] {
  const candidates: string[] = []

  for (const equivalentId of collectEquivalentItemBareIds(bareId)) {
    candidates.push(`Invicon ${humanizeToWikiTitleCase(equivalentId)}.png`)
    candidates.push(`ItemSprite ${toKebabCase(equivalentId)}.png`)
    candidates.push(`BlockSprite ${toKebabCase(equivalentId)}.png`)

    const blockOfMatch = equivalentId.match(/^(.+)_block$/)
    if (blockOfMatch) {
      const resourceId = blockOfMatch[1]!
      const resourceWord = BLOCK_OF_RESOURCE_WORD_OVERRIDES[resourceId] ?? humanizeToWikiTitleCase(resourceId)
      candidates.push(`Invicon Block of ${resourceWord}.png`)
    }
  }

  if (RAW_MEAT_ITEM_BARE_IDS.has(bareId)) candidates.push(`Invicon Raw ${humanizeToWikiTitleCase(bareId)}.png`)

  const minecartMatch = bareId.match(/^(.+)_minecart$/)
  if (minecartMatch) candidates.push(`Invicon Minecart with ${humanizeToWikiTitleCase(minecartMatch[1]!)}.png`)

  const chestBoatMatch = bareId.match(/^(.+)_chest_boat$/)
  if (chestBoatMatch) candidates.push(`Invicon ${humanizeToWikiTitleCase(chestBoatMatch[1]!)} Boat with Chest.png`)

  const bucketedMobMatch = bareId.match(/^(.+)_bucket$/)
  if (bucketedMobMatch && BUCKETED_MOB_ITEM_BARE_IDS.has(bucketedMobMatch[1]!)) {
    candidates.push(`Invicon Bucket of ${humanizeToWikiTitleCase(bucketedMobMatch[1]!)}.png`)
  }
  if (bareId === 'tropical_fish_bucket') candidates.push('Invicon Bucket of Tropical Fish.png')

  const armorTrimMatch = bareId.match(/^(.+)_armor_trim_smithing_template$/)
  if (armorTrimMatch) candidates.push(`Invicon ${humanizeToWikiTitleCase(armorTrimMatch[1]!)} Armor Trim.png`)

  const overrideFileName = ITEM_WIKI_FILE_NAME_OVERRIDES[bareId]
  if (overrideFileName) candidates.push(overrideFileName)

  return [...new Set(candidates)]
}

function buildEntitySpawnEggWikiFileNameCandidates(bareId: string): string[] {
  return [
    `Invicon ${humanizeToWikiTitleCase(bareId)} Spawn Egg.png`,
    `ItemSprite ${toKebabCase(bareId)}-spawn-egg.png`,
    `BlockSprite ${toKebabCase(bareId)}-spawn-egg.png`
  ]
}

const WIKI_METADATA_QUERY_BATCH_SIZE = 50
const wikiMetadataQueryQueue = createConcurrencyLimitedQueue(1, 500)

function delay(milliseconds: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

function isTooManyRequestsFetchError(error: unknown): boolean {
  return (error as { response?: { status?: number } })?.response?.status === 429
    || (error as { statusCode?: number })?.statusCode === 429
}

async function queryWikiImageUrlsForBatch(fileNames: string[], remainingRetries: number): Promise<Map<string, string>> {
  let response: WikiQueryResponse
  try {
    response = await $fetch<WikiQueryResponse>(MINECRAFT_WIKI_API_URL, {
      headers: { 'User-Agent': MINECRAFT_WIKI_USER_AGENT },
      query: {
        action: 'query',
        titles: fileNames.map(fileName => `File:${fileName}`).join('|'),
        prop: 'imageinfo',
        iiprop: 'url',
        redirects: '1',
        format: 'json'
      }
    })
  } catch (error) {
    if (isTooManyRequestsFetchError(error) && remainingRetries > 0) {
      await delay(5000)
      return queryWikiImageUrlsForBatch(fileNames, remainingRetries - 1)
    }
    console.error('Minecraft-Wiki-Metadaten-Abfrage fehlgeschlagen, diese Charge wird in diesem Durchlauf übersprungen:', error)
    return new Map()
  }

  const resolvedTitleByRequestedTitle = new Map<string, string>()
  for (const redirect of response.query?.redirects ?? []) {
    resolvedTitleByRequestedTitle.set(redirect.from, redirect.to)
  }

  const imageUrlByResolvedTitle = new Map<string, string>()
  for (const page of Object.values(response.query?.pages ?? {})) {
    const imageUrl = page.imageinfo?.[0]?.url
    if (imageUrl !== undefined) imageUrlByResolvedTitle.set(page.title, imageUrl)
  }

  const imageUrlByFileName = new Map<string, string>()
  for (const fileName of fileNames) {
    const requestedTitle = `File:${fileName}`
    const resolvedTitle = resolvedTitleByRequestedTitle.get(requestedTitle) ?? requestedTitle
    const imageUrl = imageUrlByResolvedTitle.get(resolvedTitle)
    if (imageUrl !== undefined) imageUrlByFileName.set(fileName, imageUrl)
  }

  return imageUrlByFileName
}

async function queryWikiImageUrlsInBatches(fileNames: string[]): Promise<Map<string, string>> {
  const uniqueFileNames = [...new Set(fileNames)]
  const mergedImageUrlByFileName = new Map<string, string>()

  for (let batchStart = 0; batchStart < uniqueFileNames.length; batchStart += WIKI_METADATA_QUERY_BATCH_SIZE) {
    const batch = uniqueFileNames.slice(batchStart, batchStart + WIKI_METADATA_QUERY_BATCH_SIZE)
    const batchResult = await wikiMetadataQueryQueue(() => queryWikiImageUrlsForBatch(batch, 2))
    for (const [fileName, imageUrl] of batchResult) mergedImageUrlByFileName.set(fileName, imageUrl)
  }

  return mergedImageUrlByFileName
}

async function queryWikiPageImageUrlsForBatch(pageTitles: string[], remainingRetries: number): Promise<Map<string, string>> {
  let response: WikiPageImageQueryResponse
  try {
    response = await $fetch<WikiPageImageQueryResponse>(MINECRAFT_WIKI_API_URL, {
      headers: { 'User-Agent': MINECRAFT_WIKI_USER_AGENT },
      query: {
        action: 'query',
        titles: pageTitles.join('|'),
        prop: 'pageimages',
        piprop: 'thumbnail',
        pithumbsize: MINECRAFT_ENTITY_ICON_THUMBNAIL_SIZE,
        redirects: '1',
        format: 'json'
      }
    })
  } catch (error) {
    if (isTooManyRequestsFetchError(error) && remainingRetries > 0) {
      await delay(5000)
      return queryWikiPageImageUrlsForBatch(pageTitles, remainingRetries - 1)
    }
    console.error('Minecraft-Wiki-Seitenbild-Abfrage fehlgeschlagen, diese Charge wird in diesem Durchlauf übersprungen:', error)
    return new Map()
  }

  const resolvedTitleByRequestedTitle = new Map<string, string>()
  for (const redirect of response.query?.redirects ?? []) {
    resolvedTitleByRequestedTitle.set(redirect.from, redirect.to)
  }

  const imageUrlByResolvedTitle = new Map<string, string>()
  for (const page of Object.values(response.query?.pages ?? {})) {
    const imageUrl = page.thumbnail?.source
    if (imageUrl !== undefined) imageUrlByResolvedTitle.set(page.title, imageUrl)
  }

  const imageUrlByPageTitle = new Map<string, string>()
  for (const pageTitle of pageTitles) {
    const resolvedTitle = resolvedTitleByRequestedTitle.get(pageTitle) ?? pageTitle
    const imageUrl = imageUrlByResolvedTitle.get(resolvedTitle)
    if (imageUrl !== undefined) imageUrlByPageTitle.set(pageTitle, imageUrl)
  }

  return imageUrlByPageTitle
}

async function queryWikiPageImageUrlsInBatches(pageTitles: string[]): Promise<Map<string, string>> {
  const uniquePageTitles = [...new Set(pageTitles)]
  const mergedImageUrlByPageTitle = new Map<string, string>()

  for (let batchStart = 0; batchStart < uniquePageTitles.length; batchStart += WIKI_METADATA_QUERY_BATCH_SIZE) {
    const batch = uniquePageTitles.slice(batchStart, batchStart + WIKI_METADATA_QUERY_BATCH_SIZE)
    const batchResult = await wikiMetadataQueryQueue(() => queryWikiPageImageUrlsForBatch(batch, 2))
    for (const [pageTitle, imageUrl] of batchResult) mergedImageUrlByPageTitle.set(pageTitle, imageUrl)
  }

  return mergedImageUrlByPageTitle
}

interface WikiIconCandidateGroup {
  bareId: string
  cacheKeyPrefix: string
  candidateFileNames: string[]
}

async function resolveWikiIconsForCandidateGroups(groups: WikiIconCandidateGroup[]): Promise<Record<string, string>> {
  const imageUrlByFileName = await queryWikiImageUrlsInBatches(groups.flatMap(group => group.candidateFileNames))

  const resolvedEntries = await Promise.all(groups.map(async (group): Promise<readonly [string, string | null]> => {
    for (const fileName of group.candidateFileNames) {
      const imageUrl = imageUrlByFileName.get(fileName)
      if (imageUrl === undefined) continue

      const extension = new URL(imageUrl).pathname.toLowerCase().endsWith('.gif') ? 'gif' : 'png'
      const iconBytes = await getOrDownloadCachedIcon(`${group.cacheKeyPrefix}/${group.bareId}.${extension}`, imageUrl)
      if (iconBytes !== null) return [group.bareId, `data:image/${extension};base64,${iconBytes.toString('base64')}`]
    }
    return [group.bareId, null]
  }))

  return Object.fromEntries(resolvedEntries.filter((entry): entry is [string, string] => entry[1] !== null))
}

export function resolveItemIconsByBareId(bareIds: string[]): Promise<Record<string, string>> {
  return resolveWikiIconsForCandidateGroups(bareIds.map(bareId => ({
    bareId,
    cacheKeyPrefix: 'wiki-items',
    candidateFileNames: buildItemWikiFileNameCandidates(bareId)
  })))
}

async function resolveEntityRenderIconsByBareId(bareIds: string[]): Promise<{ resolvedIconsByBareId: Record<string, string>, unresolvedBareIds: string[] }> {
  const pageTitleByBareId = new Map(bareIds.map(bareId => [bareId, humanizeToWikiTitleCase(bareId)] as const))
  const imageUrlByPageTitle = await queryWikiPageImageUrlsInBatches([...pageTitleByBareId.values()])

  const unresolvedBareIds: string[] = []
  const resolvedEntries = await Promise.all(bareIds.map(async (bareId): Promise<readonly [string, string | null]> => {
    const imageUrl = imageUrlByPageTitle.get(pageTitleByBareId.get(bareId)!)
    if (imageUrl === undefined) return [bareId, null]

    const extension = new URL(imageUrl).pathname.toLowerCase().endsWith('.gif') ? 'gif' : 'png'
    const iconBytes = await getOrDownloadCachedIcon(`wiki-entities/${bareId}.${extension}`, imageUrl)
    return [bareId, iconBytes !== null ? `data:image/${extension};base64,${iconBytes.toString('base64')}` : null]
  }))

  const resolvedIconsByBareId: Record<string, string> = {}
  for (const [bareId, dataUri] of resolvedEntries) {
    if (dataUri !== null) resolvedIconsByBareId[bareId] = dataUri
    else unresolvedBareIds.push(bareId)
  }

  return { resolvedIconsByBareId, unresolvedBareIds }
}

export async function resolveEntityIconsByBareId(bareIds: string[]): Promise<Record<string, string>> {
  const { resolvedIconsByBareId, unresolvedBareIds } = await resolveEntityRenderIconsByBareId(bareIds)
  if (unresolvedBareIds.length === 0) return resolvedIconsByBareId

  const spawnEggFallbackIconsByBareId = await resolveWikiIconsForCandidateGroups(unresolvedBareIds.map(bareId => ({
    bareId,
    cacheKeyPrefix: 'wiki-entities-spawn-egg-fallback',
    candidateFileNames: buildEntitySpawnEggWikiFileNameCandidates(bareId)
  })))

  return { ...resolvedIconsByBareId, ...spawnEggFallbackIconsByBareId }
}
