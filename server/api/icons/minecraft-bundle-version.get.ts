export default defineEventHandler(async (): Promise<MinecraftIconBundleVersionDto> => ({
  version: await getStoredMinecraftIconBundleVersion()
}))
