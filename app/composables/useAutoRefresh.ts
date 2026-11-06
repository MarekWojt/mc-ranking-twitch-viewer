export function useAutoRefresh(
  refresh: () => Promise<unknown>,
  pollingIntervalMilliseconds: number,
  getLoadedDataVersions: () => DataVersions | undefined
): void {
  const { latestLiveUpdate, liveUpdateStreamState, startLiveUpdateStream } = useLiveUpdateStream()
  let isMounted = false
  let lastRefreshAt = 0
  let isRefreshRunning = false
  let nextPollTimeoutId: ReturnType<typeof setTimeout> | undefined

  async function refreshIfLiveUpdateReportsChange() {
    const liveUpdate = latestLiveUpdate.value
    // the last message of a stream that stopped working says nothing about data a page has loaded since then
    if (!isMounted || isRefreshRunning || liveUpdate === null || liveUpdateStreamState.value !== 'working') return
    if (areDataVersionsCurrent(getLoadedDataVersions(), liveUpdate)) return

    isRefreshRunning = true
    lastRefreshAt = Date.now()
    try {
      await refresh()
    } finally {
      isRefreshRunning = false
    }
    if (latestLiveUpdate.value !== liveUpdate) refreshIfLiveUpdateReportsChange()
  }

  function scheduleNextPoll() {
    nextPollTimeoutId = setTimeout(() => {
      lastRefreshAt = Date.now()
      refresh()
      scheduleNextPoll()
    }, Math.max(0, lastRefreshAt + pollingIntervalMilliseconds - Date.now()))
  }

  function pollOnlyWhileVisibleAndStreamBroken() {
    clearTimeout(nextPollTimeoutId)
    if (document.visibilityState === 'visible' && liveUpdateStreamState.value === 'broken') scheduleNextPoll()
  }

  watch(latestLiveUpdate, refreshIfLiveUpdateReportsChange)
  watch(liveUpdateStreamState, pollOnlyWhileVisibleAndStreamBroken)

  onMounted(() => {
    isMounted = true
    lastRefreshAt = Date.now()
    startLiveUpdateStream()
    document.addEventListener('visibilitychange', pollOnlyWhileVisibleAndStreamBroken)
    pollOnlyWhileVisibleAndStreamBroken()
    refreshIfLiveUpdateReportsChange()
  })

  onUnmounted(() => {
    isMounted = false
    document.removeEventListener('visibilitychange', pollOnlyWhileVisibleAndStreamBroken)
    clearTimeout(nextPollTimeoutId)
  })
}
