export function useAutoRefresh(refresh: () => Promise<unknown>, intervalMilliseconds: number): void {
  let intervalId: ReturnType<typeof setInterval> | undefined

  onMounted(() => {
    intervalId = setInterval(refresh, intervalMilliseconds)
  })

  onUnmounted(() => {
    if (intervalId !== undefined) clearInterval(intervalId)
  })
}
