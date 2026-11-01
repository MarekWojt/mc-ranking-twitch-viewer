// the bundle is around 10 MB of embedded images: loaded during server rendering it ended up in the HTML of every page,
// loaded in the browser it is revalidated against the browser cache and only downloaded again after it changed
export function useMinecraftIconBundle() {
  return useApiFetch<MinecraftIconBundleDto>('/api/icons/minecraft-bundle', { server: false })
}
