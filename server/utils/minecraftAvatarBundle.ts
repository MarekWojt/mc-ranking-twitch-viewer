function toPngDataUri(bytes: Buffer): string {
  return `data:image/png;base64,${bytes.toString('base64')}`
}

interface RenderedMinecraftAvatarSet {
  body: string
  head: string
  avatar: string
}

async function renderMinecraftAvatarSet(minecraftUuid: string): Promise<RenderedMinecraftAvatarSet | null> {
  const skin = await getMinecraftSkinBytes(minecraftUuid)
  if (skin === null) return null

  const [bodyBytes, headBytes, avatarBytes] = await Promise.all([
    renderMinecraftBody(skin.bytes, skin.isSlimModel),
    renderMinecraftHead(skin.bytes, skin.isSlimModel),
    renderMinecraftAvatarIcon(skin.bytes)
  ])

  return { body: toPngDataUri(bodyBytes), head: toPngDataUri(headBytes), avatar: toPngDataUri(avatarBytes) }
}

const minecraftAvatarBundleCacheOptions = {
  name: 'minecraft-avatar-bundle',
  getKey: () => 'all',
  maxAge: 600
}

export const buildMinecraftAvatarBundle = defineCachedFunction(async (participants: Participant[]): Promise<MinecraftAvatarBundleDto> => {
  const minecraftUuids = [...new Set(participants.map(participant => participant.minecraftUuid))]

  const resolvedEntries = await Promise.all(minecraftUuids.map(async (minecraftUuid) => {
    try {
      return [minecraftUuid, await renderMinecraftAvatarSet(minecraftUuid)] as const
    } catch (error) {
      console.error(`Minecraft-Avatar für ${minecraftUuid} konnte nicht gerendert werden:`, error)
      return [minecraftUuid, null] as const
    }
  }))

  const bodyRendersByMinecraftUuid: Record<string, string> = {}
  const headRendersByMinecraftUuid: Record<string, string> = {}
  const avatarRendersByMinecraftUuid: Record<string, string> = {}

  for (const [minecraftUuid, rendered] of resolvedEntries) {
    if (rendered === null) continue
    bodyRendersByMinecraftUuid[minecraftUuid] = rendered.body
    headRendersByMinecraftUuid[minecraftUuid] = rendered.head
    avatarRendersByMinecraftUuid[minecraftUuid] = rendered.avatar
  }

  return { bodyRendersByMinecraftUuid, headRendersByMinecraftUuid, avatarRendersByMinecraftUuid }
}, minecraftAvatarBundleCacheOptions)
