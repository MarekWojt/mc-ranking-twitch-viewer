const VALID_MINECRAFT_AVATAR_RENDER_KINDS: MinecraftAvatarRenderKind[] = ['body', 'head', 'avatar']

function isValidMinecraftAvatarRenderKind(kind: string): kind is MinecraftAvatarRenderKind {
  return (VALID_MINECRAFT_AVATAR_RENDER_KINDS as string[]).includes(kind)
}

export default defineEventHandler(async (event) => {
  const uuidParam = getRouterParam(event, 'uuid')
  const kindParam = getRouterParam(event, 'kind')

  if (!uuidParam || !isValidMinecraftUuid(uuidParam)) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültige Minecraft-UUID' })
  }
  if (!kindParam || !isValidMinecraftAvatarRenderKind(kindParam)) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültige Avatar-Art' })
  }

  let pngBytes: Buffer | null
  try {
    pngBytes = await getMinecraftAvatarRender(normalizeMinecraftUuid(uuidParam), kindParam)
  } catch (error) {
    console.error(`Minecraft-Avatar (${kindParam}) für ${uuidParam} konnte nicht gerendert werden:`, error)
    throw createError({ statusCode: 502, statusMessage: 'Avatar konnte nicht gerendert werden' })
  }

  if (pngBytes === null) {
    throw createError({ statusCode: 404, statusMessage: 'Avatar nicht gefunden' })
  }

  setResponseHeader(event, 'Content-Type', 'image/png')
  setResponseHeader(event, 'Cache-Control', 'public, max-age=86400')
  return pngBytes
})
