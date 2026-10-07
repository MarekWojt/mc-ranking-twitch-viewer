const ADVANCEMENT_SLUG_PART_SEPARATOR = '~'

export function encodeAdvancementSlug(advancementId: string): string {
  const colonIndex = advancementId.indexOf(':')
  const slashIndex = advancementId.indexOf('/')
  const namespace = advancementId.slice(0, colonIndex)
  const category = advancementId.slice(colonIndex + 1, slashIndex)
  const name = advancementId.slice(slashIndex + 1)
  return `${namespace}.${category}${ADVANCEMENT_SLUG_PART_SEPARATOR}${name}`
}

export function decodeAdvancementSlug(slug: string): string | null {
  const [namespaceAndCategory, name] = slug.split(ADVANCEMENT_SLUG_PART_SEPARATOR)
  if (!namespaceAndCategory || !name) return null

  const dotIndex = namespaceAndCategory.indexOf('.')
  if (dotIndex === -1) return null

  const namespace = namespaceAndCategory.slice(0, dotIndex)
  const category = namespaceAndCategory.slice(dotIndex + 1)
  return `${namespace}:${category}/${name}`
}
