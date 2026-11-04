export default defineEventHandler(async (event) => {
  const iconBytes = await readStoredWikiIcon(getRouterParam(event, 'iconDirectory')!, getRouterParam(event, 'bareId')!)
  const contentType = iconBytes && detectAnimatedIconContentType(iconBytes)

  if (!iconBytes || !contentType) {
    throw createError({ statusCode: 404, statusMessage: 'Icon nicht gefunden' })
  }

  setResponseHeader(event, 'Content-Type', contentType)
  // the URL contains a hash of the image, so a changed image gets a new URL and browsers never have to ask again
  setResponseHeader(event, 'Cache-Control', 'public, max-age=31536000, immutable')
  return iconBytes
})
