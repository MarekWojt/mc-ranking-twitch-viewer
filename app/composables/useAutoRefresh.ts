// a forgotten tab used to load the same data around the clock, which caused more traffic than everything else together; hidden
// tabs therefore stop asking, and a tab that becomes visible again only asks right away if its last refresh is older than the interval
export function useAutoRefresh(refresh: () => Promise<unknown>, intervalMilliseconds: number): void {
  let lastRefreshAt = 0
  let nextRefreshTimeoutId: ReturnType<typeof setTimeout> | undefined

  function scheduleNextRefresh() {
    nextRefreshTimeoutId = setTimeout(() => {
      lastRefreshAt = Date.now()
      refresh()
      scheduleNextRefresh()
    }, Math.max(0, lastRefreshAt + intervalMilliseconds - Date.now()))
  }

  function restartOrStopRefreshingForCurrentVisibility() {
    clearTimeout(nextRefreshTimeoutId)
    if (document.visibilityState === 'visible') scheduleNextRefresh()
  }

  onMounted(() => {
    lastRefreshAt = Date.now()
    document.addEventListener('visibilitychange', restartOrStopRefreshingForCurrentVisibility)
    restartOrStopRefreshingForCurrentVisibility()
  })

  onUnmounted(() => {
    document.removeEventListener('visibilitychange', restartOrStopRefreshingForCurrentVisibility)
    clearTimeout(nextRefreshTimeoutId)
  })
}
