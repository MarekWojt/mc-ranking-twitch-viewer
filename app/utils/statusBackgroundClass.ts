export function buildStatusBackgroundClass(isLiveOnTwitch: boolean, isOnlineOnMinecraftServer: boolean): string | undefined {
  if (isLiveOnTwitch && isOnlineOnMinecraftServer) return 'bg-success/10'
  if (isLiveOnTwitch) return 'bg-info/10'
  return undefined
}
