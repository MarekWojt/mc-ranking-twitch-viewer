interface TwitchGetUsersResponseEntry {
  login: string
  display_name: string
  profile_image_url: string
}

interface TwitchGetUsersResponse {
  data: TwitchGetUsersResponseEntry[]
}

async function fetchUserProfilesBatch(twitchLogins: string[]): Promise<TwitchGetUsersResponseEntry[]> {
  const { twitchClientId } = useRuntimeConfig()
  const response = await fetchTwitchHelixWithTokenRetry(accessToken => $fetch<TwitchGetUsersResponse>('https://api.twitch.tv/helix/users', {
    query: { login: twitchLogins },
    headers: {
      'Client-Id': twitchClientId,
      'Authorization': `Bearer ${accessToken}`
    }
  }))
  return response.data
}

const twitchDisplayNameFromLoginCacheTtlSeconds = 60 * 60 * 24

export const resolveTwitchDisplayNameFromLogin = defineCachedFunction(async (twitchLogin: string): Promise<string> => {
  const [profile] = await fetchUserProfilesBatch([twitchLogin])
  if (!profile) throw new Error(`Twitch-Nutzer "${twitchLogin}" wurde nicht gefunden`)
  return profile.display_name
}, {
  name: 'twitch-display-name-from-login',
  getKey: (twitchLogin: string) => twitchLogin.toLowerCase(),
  maxAge: twitchDisplayNameFromLoginCacheTtlSeconds
})

const twitchUserProfileCacheTtlSeconds = 60 * 60

export const getTwitchProfileImageUrlsByLogin = defineCachedFunction(async (): Promise<TimestampedValue<Record<string, string>>> => {
  const { value: participants } = await loadParticipants()
  const twitchLogins = [...new Set(
    participants
      .map(participant => participant.twitchLogin)
      .filter((twitchLogin): twitchLogin is string => twitchLogin !== null)
  )]
  if (twitchLogins.length === 0) return { value: {}, fetchedAt: new Date().toISOString() }

  try {
    const batches = splitIntoBatches(twitchLogins, TWITCH_HELIX_LOGIN_BATCH_SIZE)
    const batchResults = await Promise.all(batches.map(fetchUserProfilesBatch))

    const profileImageUrlByTwitchLogin = Object.fromEntries(
      batchResults.flat().map(entry => [entry.login.toLowerCase(), entry.profile_image_url])
    )
    return { value: profileImageUrlByTwitchLogin, fetchedAt: new Date().toISOString() }
  } catch (error) {
    console.error('Twitch-Profilbilder konnten nicht abgerufen werden:', error)
    return { value: {}, fetchedAt: new Date().toISOString() }
  }
}, {
  name: 'twitch-user-profiles',
  getKey: () => 'all',
  maxAge: twitchUserProfileCacheTtlSeconds
})
