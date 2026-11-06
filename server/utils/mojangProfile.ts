interface MojangNameLookupResponse {
  id: string
  name: string
}

interface MojangProfileProperty {
  name: string
  value: string
}

interface MojangSessionProfileResponse {
  id: string
  name: string
  properties: MojangProfileProperty[]
}

interface MojangSkinTexturesPayload {
  textures: {
    SKIN?: { url: string, metadata?: { model?: string } }
  }
}

export interface MinecraftSkinInfo {
  skinTextureUrl: string
  isSlimModel: boolean
}

interface MojangSessionProfile {
  name: string
  skin: MinecraftSkinInfo | null
}

const mojangApiRequestQueue = createConcurrencyLimitedQueue(1, 650)

function enqueueMojangRequest<T>(request: () => Promise<T>, loadContext: CachedValueLoadContext): Promise<T> {
  return mojangApiRequestQueue(request, { isBackgroundTask: () => !loadContext.isUrgent })
}

async function fetchMinecraftUuidByName(minecraftName: string, loadContext: CachedValueLoadContext): Promise<string> {
  try {
    const profile = await enqueueMojangRequest(() => $fetch<MojangNameLookupResponse>(
      `https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(minecraftName)}`,
      { timeout: EXTERNAL_REQUEST_TIMEOUT_MILLISECONDS }
    ), loadContext)
    return normalizeMinecraftUuid(profile.id)
  } catch (error) {
    if (isNotFoundFetchError(error)) throw new Error(`Mojang kennt keinen Minecraft-Account mit dem Namen "${minecraftName}"`, { cause: error })
    throw error
  }
}

const minecraftUuidByNameCache = createBackgroundRefreshedCache<string>({
  describeValue: minecraftName => `Minecraft-UUID zum Namen "${minecraftName}"`,
  load: fetchMinecraftUuidByName,
  // a found UUID is written into participants.toml, so it is never looked up again
  refreshIntervalMilliseconds: Number.POSITIVE_INFINITY
})

export function lookUpMinecraftUuidByNameWithoutWaiting(minecraftName: string): CachedValueLookup<string> {
  return minecraftUuidByNameCache.lookUpWithoutWaiting(minecraftName.toLowerCase(), { isUrgent: true })
}

function parseMinecraftSkinInfo(properties: MojangProfileProperty[]): MinecraftSkinInfo | null {
  const texturesProperty = properties.find(property => property.name === 'textures')
  if (!texturesProperty) return null

  const texturesPayload = JSON.parse(Buffer.from(texturesProperty.value, 'base64').toString('utf8')) as MojangSkinTexturesPayload
  const skinTexture = texturesPayload.textures.SKIN
  if (!skinTexture) return null

  return { skinTextureUrl: skinTexture.url, isSlimModel: skinTexture.metadata?.model === 'slim' }
}

async function fetchMojangSessionProfile(minecraftUuid: string, loadContext: CachedValueLoadContext): Promise<MojangSessionProfile> {
  const profile = await enqueueMojangRequest(() => $fetch<MojangSessionProfileResponse>(
    `https://sessionserver.mojang.com/session/minecraft/profile/${minecraftUuid.replaceAll('-', '')}`,
    { timeout: EXTERNAL_REQUEST_TIMEOUT_MILLISECONDS }
  ), loadContext)
  return { name: profile.name, skin: parseMinecraftSkinInfo(profile.properties) }
}

const mojangSessionProfileCache = createBackgroundRefreshedCache<MojangSessionProfile>({
  describeValue: minecraftUuid => `Mojang-Profil von ${minecraftUuid}`,
  load: fetchMojangSessionProfile,
  // also decides how soon a changed name or skin shows up; renders are only redone when the skin texture actually differs
  refreshIntervalMilliseconds: 60 * 60 * 1000
})

export function lookUpCurrentMinecraftNameWithoutWaiting(minecraftUuid: string, lookUpOptions: LookUpWithoutWaitingOptions = {}): CachedValueLookup<string> {
  const profileLookup = mojangSessionProfileCache.lookUpWithoutWaiting(minecraftUuid, lookUpOptions)
  return profileLookup.status === 'stored' ? { status: 'stored', value: profileLookup.value.name } : profileLookup
}

export async function resolveMinecraftSkinInfo(minecraftUuid: string): Promise<MinecraftSkinInfo | null> {
  return (await mojangSessionProfileCache.getStoredValueOrWaitForFirstLoad(minecraftUuid)).skin
}
