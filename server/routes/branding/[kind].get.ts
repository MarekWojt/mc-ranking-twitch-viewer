const BRANDING_IMAGE_KINDS: BrandingImageKind[] = ['logo', 'favicon']

function isBrandingImageKind(value: string | undefined): value is BrandingImageKind {
  return BRANDING_IMAGE_KINDS.includes(value as BrandingImageKind)
}

export default defineEventHandler(async (event) => {
  const kind = getRouterParam(event, 'kind')
  if (!isBrandingImageKind(kind)) {
    throw createError({ statusCode: 404 })
  }

  const brandingImage = await getLoadedBrandingImage(kind)
  if (!brandingImage) {
    return sendRedirect(event, DEFAULT_BRANDING_IMAGE_PATH)
  }

  setResponseHeader(event, 'Content-Type', brandingImage.contentType)
  // the image only changes on a server restart, so browsers may reuse it briefly but must not keep it for long
  setResponseHeader(event, 'Cache-Control', 'public, max-age=300')
  return brandingImage.contents
})
