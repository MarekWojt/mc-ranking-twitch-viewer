export function useMinecraftAvatarBundle() {
  return useFetch<MinecraftAvatarBundleDto>('/api/avatars/minecraft-bundle', { key: 'minecraft-avatar-bundle' })
}
