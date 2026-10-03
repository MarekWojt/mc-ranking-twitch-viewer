interface TwitchAppAccessTokenResponse {
  access_token: string
  expires_in: number
  token_type: string
}

export async function fetchFreshTwitchAppAccessToken(): Promise<string> {
  const { twitchClientId, twitchClientSecret } = useRuntimeConfig()
  const response = await $fetch<TwitchAppAccessTokenResponse>('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    query: {
      client_id: twitchClientId,
      client_secret: twitchClientSecret,
      grant_type: 'client_credentials'
    }
  })
  return response.access_token
}

const twitchAppAccessTokenCacheOptions = {
  name: 'twitch-app-access-token',
  getKey: () => 'all',
  maxAge: 60 * 50
}

export const getTwitchAppAccessToken = defineCachedFunction(fetchFreshTwitchAppAccessToken, twitchAppAccessTokenCacheOptions)
