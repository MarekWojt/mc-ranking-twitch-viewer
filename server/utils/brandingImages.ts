import { readFile } from 'node:fs/promises'
import { extname } from 'node:path'

export type BrandingImageKind = 'logo' | 'favicon'

interface BrandingImage {
  contents: Buffer
  contentType: string
}

export const DEFAULT_BRANDING_IMAGE_PATH = '/favicon.ico'

const CONTENT_TYPES_BY_FILE_EXTENSION: Record<string, string> = {
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp'
}

const loadedBrandingImages = new Map<BrandingImageKind, BrandingImage>()

async function loadBrandingImage(kind: BrandingImageKind, filePath: string) {
  if (!filePath) return

  const contentType = CONTENT_TYPES_BY_FILE_EXTENSION[extname(filePath).toLowerCase()]
  if (!contentType) {
    console.warn(`Branding-Bild „${kind}“ hat ein unbekanntes Dateiformat, nutze Standardlogo: ${filePath}`)
    return
  }

  try {
    loadedBrandingImages.set(kind, { contents: await readFile(filePath), contentType })
  } catch (error) {
    console.warn(`Branding-Bild „${kind}“ konnte nicht gelesen werden, nutze Standardlogo:`, error)
  }
}

let brandingImagesLoading: Promise<void> | undefined

export function loadBrandingImages(): Promise<void> {
  const { serverLogoFilePath, serverFaviconFilePath } = useRuntimeConfig()
  brandingImagesLoading ??= Promise.all([
    loadBrandingImage('logo', serverLogoFilePath),
    loadBrandingImage('favicon', serverFaviconFilePath)
  ]).then(() => undefined)
  return brandingImagesLoading
}

// Nitro does not await async plugins, so a request right after startup has to wait for the images itself
export async function getLoadedBrandingImage(kind: BrandingImageKind): Promise<BrandingImage | undefined> {
  await loadBrandingImages()
  return loadedBrandingImages.get(kind)
}
