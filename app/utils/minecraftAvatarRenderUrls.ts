export function buildMinecraftAvatarRenderUrl(minecraftUuid: string, kind: 'body' | 'head' | 'avatar'): string {
  return `/api/avatars/minecraft/${minecraftUuid}/${kind}`
}
