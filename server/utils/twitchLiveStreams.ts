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
    }
  }))
  return response.data
}

const twitchLiveStreamsCacheOptions = {
  name: 'twitch-live-streams',
  getKey: () => 'all',
  maxAge: useRuntimeConfig().twitchLiveStatusCacheTtlSeconds,
  ...FRESH_DATA_CACHE_OPTIONS
}

export const getLiveTwitchStreamsByLogin = defineCachedFunction(async (): Promise<TimestampedValue<Record<string, TwitchLiveStream>>> => {
  const { value: participants } = await loadParticipants()
  const twitchLogins = [...new Set(
    participants
      .map(participant => participant.twitchLogin)
      .filter((twitchLogin): twitchLogin is string => twitchLogin !== null)
  )]
  if (twitchLogins.length === 0) return { value: {}, fetchedAt: new Date().toISOString() }

  const batches = splitIntoBatches(twitchLogins, TWITCH_HELIX_LOGIN_BATCH_SIZE)
  const batchResults = await Promise.all(batches.map(fetchLiveStreamsBatch))

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
}, twitchLiveStreamsCacheOptions)
