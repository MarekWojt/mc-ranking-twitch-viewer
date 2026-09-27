const STATISTIC_SLUG_PART_SEPARATOR = '~'

export function encodeStatisticSlug(category: string, key: string): string {
  return `${category.replaceAll(':', '.')}${STATISTIC_SLUG_PART_SEPARATOR}${key.replaceAll(':', '.')}`
}

export function decodeStatisticSlug(slug: string): { category: string, key: string } | null {
  const [categoryPart, keyPart] = slug.split(STATISTIC_SLUG_PART_SEPARATOR)
  if (!categoryPart || !keyPart) return null

  return {
    category: categoryPart.replaceAll('.', ':'),
    key: keyPart.replaceAll('.', ':')
  }
}
