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

export async function resolveMinecraftUuidFromName(minecraftName: string): Promise<string> {
  const profile = await mojangApiRequestQueue(() => $fetch<MojangNameLookupResponse>(
    `https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(minecraftName)}`
  ))
  return normalizeMinecraftUuid(profile.id)
}

function parseMinecraftSkinInfo(properties: MojangProfileProperty[]): MinecraftSkinInfo | null {
  const texturesProperty = properties.find(property => property.name === 'textures')
  if (!texturesProperty) return null

  const texturesPayload = JSON.parse(Buffer.from(texturesProperty.value, 'base64').toString('utf8')) as MojangSkinTexturesPayload
  const skinTexture = texturesPayload.textures.SKIN
  if (!skinTexture) return null

  return { skinTextureUrl: skinTexture.url, isSlimModel: skinTexture.metadata?.model === 'slim' }
}

async function fetchMojangSessionProfile(minecraftUuid: string): Promise<MojangSessionProfile> {
  const undashedMinecraftUuid = minecraftUuid.replaceAll('-', '')
  const profile = await mojangApiRequestQueue(() => $fetch<MojangSessionProfileResponse>(
    `https://sessionserver.mojang.com/session/minecraft/profile/${undashedMinecraftUuid}`
  ))
  return { name: profile.name, skin: parseMinecraftSkinInfo(profile.properties) }
}

const mojangSessionProfileCacheOptions = {
  name: 'mojang-session-profile',
  getKey: (minecraftUuid: string) => minecraftUuid,
  maxAge: 60 * 60 * 24
}

const resolveMojangSessionProfile = defineCachedFunction(fetchMojangSessionProfile, mojangSessionProfileCacheOptions)

export async function resolveMinecraftNameFromUuid(minecraftUuid: string): Promise<string> {
  return (await resolveMojangSessionProfile(minecraftUuid)).name
}

export async function resolveMinecraftSkinInfo(minecraftUuid: string): Promise<MinecraftSkinInfo | null> {
  return (await resolveMojangSessionProfile(minecraftUuid)).skin
}
