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

  let avatarRender: MinecraftAvatarRender | null
  try {
    avatarRender = await getMinecraftAvatarRender(normalizeMinecraftUuid(uuidParam), kindParam)
  } catch (error) {
    console.error(`Minecraft-Avatar (${kindParam}) für ${uuidParam} konnte nicht gerendert werden:`, error)
    throw createError({ statusCode: 502, statusMessage: 'Avatar konnte nicht gerendert werden' })
  }

  if (avatarRender === null) {
    throw createError({ statusCode: 404, statusMessage: 'Avatar nicht gefunden' })
  }

  const entityTag = `"${avatarRender.renderId}"`
  setResponseHeader(event, 'ETag', entityTag)
  // browsers keep showing the image they have while checking for a new skin in the background
  setResponseHeader(event, 'Cache-Control', 'public, max-age=300, stale-while-revalidate=604800')
  if (getRequestHeader(event, 'if-none-match') === entityTag) {
    setResponseStatus(event, 304)
    return null
  }

  setResponseHeader(event, 'Content-Type', 'image/png')
  return avatarRender.pngBytes
})
