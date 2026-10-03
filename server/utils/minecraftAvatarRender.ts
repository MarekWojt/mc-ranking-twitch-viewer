function renderMinecraftAvatarByKind(kind: MinecraftAvatarRenderKind, skinBytes: Buffer, isSlimModel: boolean): Promise<Buffer> {
  if (kind === 'body') return renderMinecraftBody(skinBytes, isSlimModel)
  if (kind === 'head') return renderMinecraftHead(skinBytes, isSlimModel)
  return renderMinecraftAvatarIcon(skinBytes)
}

const minecraftAvatarRenderCacheOptions = {
  name: 'minecraft-avatar-render',
  getKey: (minecraftUuid: string, kind: MinecraftAvatarRenderKind) => `${minecraftUuid}:${kind}`,
  maxAge: 60 * 60 * 24
}

// Nitro caches this via JSON-serializing unstorage, so a raw Buffer would come back
// as a plain {type, data} object on a cache hit instead of a real Buffer — base64 survives intact.
const getMinecraftAvatarRenderBase64 = defineCachedFunction(async (minecraftUuid: string, kind: MinecraftAvatarRenderKind): Promise<string | null> => {
  const skin = await getMinecraftSkinBytes(minecraftUuid)
  if (skin === null) return null

  const renderedBytes = await renderMinecraftAvatarByKind(kind, skin.bytes, skin.isSlimModel)
  return renderedBytes.toString('base64')
}, minecraftAvatarRenderCacheOptions)

export async function getMinecraftAvatarRender(minecraftUuid: string, kind: MinecraftAvatarRenderKind): Promise<Buffer | null> {
  const base64 = await getMinecraftAvatarRenderBase64(minecraftUuid, kind)
  return base64 === null ? null : Buffer.from(base64, 'base64')
}
