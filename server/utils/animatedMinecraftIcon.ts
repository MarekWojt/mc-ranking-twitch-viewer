import { createHash } from 'node:crypto'

type AnimatedIconContentType = 'image/gif' | 'image/webp'

// looks at the file contents because wiki thumbnails of animated mobs can be WebP files stored with a .png extension
export function detectAnimatedIconContentType(iconBytes: Buffer): AnimatedIconContentType | null {
  const firstFourCharacters = iconBytes.toString('latin1', 0, 4)
  if (firstFourCharacters === 'GIF8') return 'image/gif'
  if (firstFourCharacters === 'RIFF' && iconBytes.toString('latin1', 8, 12) === 'WEBP') return 'image/webp'
  return null
}

export function hashIconContent(iconBytes: Buffer): string {
  return createHash('sha256').update(iconBytes).digest('hex').slice(0, 16)
}

// deliberately without a file extension, so that a proxy never mistakes this route for a static file
export function buildAnimatedIconUrl(iconDirectory: string, bareId: string, iconBytes: Buffer): string {
  return `/api/icons/animated/${iconDirectory}/${bareId}?content=${hashIconContent(iconBytes)}`
}
