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

export async function resolveMinecraftNameFromUuid(minecraftUuid: string): Promise<string> {
  const undashedMinecraftUuid = minecraftUuid.replaceAll('-', '')
  const profile = await $fetch<MojangProfileResponse>(
    `https://sessionserver.mojang.com/session/minecraft/profile/${undashedMinecraftUuid}`
  )
  return profile.name
}
