export function isValidMinecraftUuid(uuid: string): boolean {
  return /^[0-9a-f]{32}$/i.test(uuid.replaceAll('-', ''))
}

export function normalizeMinecraftUuid(uuid: string): string {
  const hexDigitsOnly = uuid.replaceAll('-', '').toLowerCase()
  return [
    hexDigitsOnly.slice(0, 8),
    hexDigitsOnly.slice(8, 12),
    hexDigitsOnly.slice(12, 16),
    hexDigitsOnly.slice(16, 20),
    hexDigitsOnly.slice(20)
  ].join('-')
}
