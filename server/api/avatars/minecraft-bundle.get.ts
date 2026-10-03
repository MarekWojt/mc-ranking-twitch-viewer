export default defineEventHandler(async (): Promise<MinecraftAvatarBundleDto> => {
  const { value: participants } = await loadParticipants()
  return buildMinecraftAvatarBundle(participants)
})
