interface MojangProfileResponse {
  id: string
  name: string
}

export async function resolveMinecraftUuidFromName(minecraftName: string): Promise<string> {
  const profile = await $fetch<MojangProfileResponse>(
    `https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(minecraftName)}`
  )
  return normalizeMinecraftUuid(profile.id)
}

async function fetchMinecraftNameFromUuid(minecraftUuid: string): Promise<string> {
  const undashedMinecraftUuid = minecraftUuid.replaceAll('-', '')
  const profile = await $fetch<MojangProfileResponse>(
    `https://sessionserver.mojang.com/session/minecraft/profile/${undashedMinecraftUuid}`
  )
  return profile.name
}

const minecraftNameFromUuidCacheOptions = {
  name: 'mojang-minecraft-name-from-uuid',
  getKey: (minecraftUuid: string) => minecraftUuid,
  maxAge: 60 * 60 * 24
}

export const resolveMinecraftNameFromUuid = defineCachedFunction(fetchMinecraftNameFromUuid, minecraftNameFromUuidCacheOptions)
