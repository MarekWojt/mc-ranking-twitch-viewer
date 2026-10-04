export function humanizeMinecraftId(id: string): string {
  const namespaceSeparatorIndex = id.indexOf(':')
  const idWithoutNamespace = namespaceSeparatorIndex === -1 ? id : id.slice(namespaceSeparatorIndex + 1)
  const idWithoutCentimeterSuffix = idWithoutNamespace.replace(/_one_cm$/, '')

  return idWithoutCentimeterSuffix
    .split('_')
    .filter(word => word.length > 0)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
