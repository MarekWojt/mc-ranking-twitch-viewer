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
