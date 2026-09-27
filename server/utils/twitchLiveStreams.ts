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

const twitchHelixUserLoginBatchSize = 100

function splitIntoBatches<T>(items: T[], batchSize: number): T[][] {
  const batches: T[][] = []
  for (let startIndex = 0; startIndex < items.length; startIndex += batchSize) {
    batches.push(items.slice(startIndex, startIndex + batchSize))
  }
  return batches
}

async function fetchLiveStreamsBatch(twitchLogins: string[], accessToken: string): Promise<TwitchGetStreamsResponseEntry[]> {
  const { twitchClientId } = useRuntimeConfig()
  const response = await $fetch<TwitchGetStreamsResponse>('https://api.twitch.tv/helix/streams', {
    query: { user_login: twitchLogins },
    headers: {
      'Client-Id': twitchClientId,
      'Authorization': `Bearer ${accessToken}`
    }
  })
  return response.data
}

function isUnauthorizedFetchError(error: unknown): boolean {
  return (error as { response?: { status?: number }, statusCode?: number })?.response?.status === 401
    || (error as { statusCode?: number })?.statusCode === 401
}

async function fetchLiveStreamsBatchWithTokenRetry(twitchLogins: string[]): Promise<TwitchGetStreamsResponseEntry[]> {
  const cachedAccessToken = await getTwitchAppAccessToken()
  try {
    return await fetchLiveStreamsBatch(twitchLogins, cachedAccessToken)
  } catch (error) {
    if (!isUnauthorizedFetchError(error)) throw error
    const freshAccessToken = await fetchFreshTwitchAppAccessToken()
    return await fetchLiveStreamsBatch(twitchLogins, freshAccessToken)
  }
}

const twitchLiveStatusCacheTtlSeconds = useRuntimeConfig().twitchLiveStatusCacheTtlSeconds

export const getLiveTwitchStreamsByLogin = defineCachedFunction(async (): Promise<Record<string, TwitchLiveStream>> => {
  const participants = await loadParticipants()
  const twitchLogins = [...new Set(
    participants
      .map(participant => participant.twitchLogin)
      .filter((twitchLogin): twitchLogin is string => twitchLogin !== null)
  )]
  if (twitchLogins.length === 0) return {}

  try {
    const batches = splitIntoBatches(twitchLogins, twitchHelixUserLoginBatchSize)
    const batchResults = await Promise.all(batches.map(fetchLiveStreamsBatchWithTokenRetry))

    return Object.fromEntries(batchResults.flat().map(entry => [
      entry.user_login.toLowerCase(),
      {
        userLogin: entry.user_login,
        title: entry.title,
        gameName: entry.game_name,
        viewerCount: entry.viewer_count,
        startedAt: entry.started_at
      } satisfies TwitchLiveStream
    ]))
  } catch (error) {
    console.error('Twitch-Live-Status konnte nicht abgerufen werden, alle Teilnehmer gelten als nicht live:', error)
    return {}
  }
}, {
  name: 'twitch-live-streams',
  getKey: () => 'all',
  maxAge: twitchLiveStatusCacheTtlSeconds
})
