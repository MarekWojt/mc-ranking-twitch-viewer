export function stripMinecraftNamespace(minecraftId: string): string {
  const namespaceSeparatorIndex = minecraftId.indexOf(':')
  return namespaceSeparatorIndex === -1 ? minecraftId : minecraftId.slice(namespaceSeparatorIndex + 1)
}

export function toMinecraftId(bareId: string): string {
  return `minecraft:${bareId}`
}
