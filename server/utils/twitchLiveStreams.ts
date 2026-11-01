export interface TwitchLiveStream {
  userLogin: string
  title: string
  gameName: string
  viewerCount: number
  startedAt: string
}

interface TwitchGetStreamsResponseEntry {
  user_login: string
  title: string
  game_name: string
  viewer_count: number
  started_at: string
}

interface TwitchGetStreamsResponse {
  data: TwitchGetStreamsResponseEntry[]
}

async function fetchLiveStreamsBatch(twitchLogins: string[]): Promise<TwitchGetStreamsResponseEntry[]> {
  const { twitchClientId } = useRuntimeConfig()
  const response = await fetchTwitchHelixWithTokenRetry(accessToken => $fetch<TwitchGetStreamsResponse>('https://api.twitch.tv/helix/streams', {
    query: { user_login: twitchLogins },
    headers: {
      'Client-Id': twitchClientId,
      'Authorization': `Bearer ${accessToken}`
    },
    timeout: EXTERNAL_REQUEST_TIMEOUT_MILLISECONDS
  }))
  return response.data
}

async function fetchLiveStreamsOfParticipants(): Promise<TimestampedValue<Record<string, TwitchLiveStream>>> {
  const twitchLogins = await loadSortedParticipantTwitchLogins()
  const batchResults = await Promise.all(splitIntoBatches(twitchLogins, TWITCH_HELIX_LOGIN_BATCH_SIZE).map(fetchLiveStreamsBatch))

  const liveStreamsByTwitchLogin = Object.fromEntries(batchResults.flat().map(entry => [
    entry.user_login.toLowerCase(),
    {
      userLogin: entry.user_login,
      title: entry.title,
      gameName: entry.game_name,
      viewerCount: entry.viewer_count,
      startedAt: entry.started_at
    } satisfies TwitchLiveStream
  ]))
  return { value: liveStreamsByTwitchLogin, fetchedAt: new Date().toISOString() }
}

const liveTwitchStreamsCache = createBackgroundRefreshedCache<TimestampedValue<Record<string, TwitchLiveStream>>>({
  describeValue: () => 'Twitch-Live-Status',
  load: fetchLiveStreamsOfParticipants,
  refreshIntervalMilliseconds: useRuntimeConfig().twitchLiveStatusCacheTtlSeconds * 1000
})

export function getLiveTwitchStreamsByLogin(): Promise<TimestampedValue<Record<string, TwitchLiveStream>>> {
  return liveTwitchStreamsCache.getStoredValueOrWaitForFirstLoad('all')
}
