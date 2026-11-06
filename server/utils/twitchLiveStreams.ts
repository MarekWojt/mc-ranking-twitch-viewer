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

const LIVE_STATUS_REFRESH_INTERVAL_MILLISECONDS = useRuntimeConfig().twitchLiveStatusCacheTtlSeconds * 1000
// the same time after which the scores are computed again: while anyone has a tab open the regular refreshes keep the value younger
// than this, so only a quiet time ever makes a request wait
const LIVE_STATUS_OUTDATED_AFTER_MILLISECONDS = 5 * 60 * 1000
// the Twitch request usually takes around 160 ms
const LIVE_STATUS_MAX_WAIT_MILLISECONDS = 500

const liveTwitchStreamsCache = createBackgroundRefreshedCache<TimestampedValue<Record<string, TwitchLiveStream>>>({
  describeValue: () => 'Twitch-Live-Status',
  load: fetchLiveStreamsOfParticipants,
  refreshIntervalMilliseconds: LIVE_STATUS_REFRESH_INTERVAL_MILLISECONDS
})

export async function getLiveTwitchStreamsByLogin(): Promise<TimestampedValue<Record<string, TwitchLiveStream>>> {
  try {
    return await liveTwitchStreamsCache.getValueWaitingBrieflyIfOutdated('all', {
      outdatedAfterMilliseconds: LIVE_STATUS_OUTDATED_AFTER_MILLISECONDS,
      maxWaitMilliseconds: LIVE_STATUS_MAX_WAIT_MILLISECONDS
    })
  } catch {
    // not logged: the cache reports every failed load once, while an open page asks for the status every 2 seconds
    return { value: {}, fetchedAt: new Date().toISOString() }
  }
}
