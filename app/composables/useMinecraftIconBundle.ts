const ICON_BUNDLE_UPDATE_CHECK_INTERVAL_MILLISECONDS = 60_000

// the bundle is over 1 MB of embedded images and rarely changes: no page waits for it, icons simply appear once it has
// arrived, and all further pages of this visit reuse it until its version says that its icons changed; it is only ever loaded
// in the browser, because loaded during server rendering it ended up in the HTML of every page
const iconBundle = shallowRef<MinecraftIconBundleDto | null>(null)
const hasIconBundleDownloadFailed = shallowRef(false)
const isIconBundleLoading = computed(() => iconBundle.value === null && !hasIconBundleDownloadFailed.value)
let isIconBundleDownloadRunning = false

async function downloadIconBundle(cacheBustingQuery: Record<string, string>) {
  if (isIconBundleDownloadRunning) return
  isIconBundleDownloadRunning = true

  try {
    iconBundle.value = await $fetch<MinecraftIconBundleDto>('/api/icons/minecraft-bundle', { query: cacheBustingQuery })
    hasIconBundleDownloadFailed.value = false
  } catch (error) {
    hasIconBundleDownloadFailed.value = true
    console.error('Minecraft-Icons konnten nicht geladen werden, es wird später erneut versucht:', error)
  } finally {
    isIconBundleDownloadRunning = false
  }
}

async function downloadIconBundleIfIconsChanged(cacheBustingQuery: Record<string, string>) {
  if (iconBundle.value === null) {
    await downloadIconBundle(cacheBustingQuery)
    return
  }

  try {
    const { version } = await $fetch<MinecraftIconBundleVersionDto>('/api/icons/minecraft-bundle-version')
    if (version !== iconBundle.value.version) await downloadIconBundle(cacheBustingQuery)
  } catch (error) {
    console.error('Version der Minecraft-Icons konnte nicht geprüft werden, es wird später erneut versucht:', error)
  }
}

export function useMinecraftIconBundle() {
  const cacheBustingQuery = useApiCacheBustingQuery()
  const loadIconBundleIfNeeded = () => downloadIconBundleIfIconsChanged(cacheBustingQuery)

  onMounted(loadIconBundleIfNeeded)
  useAutoRefresh(loadIconBundleIfNeeded, ICON_BUNDLE_UPDATE_CHECK_INTERVAL_MILLISECONDS)

  return { iconBundle, isIconBundleLoading }
}
