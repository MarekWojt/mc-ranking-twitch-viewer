export const TWITCH_HELIX_LOGIN_BATCH_SIZE = 100

export function splitIntoBatches<T>(items: T[], batchSize: number): T[][] {
  const batches: T[][] = []
  for (let startIndex = 0; startIndex < items.length; startIndex += batchSize) {
    batches.push(items.slice(startIndex, startIndex + batchSize))
  }
  return batches
}

function isUnauthorizedFetchError(error: unknown): boolean {
  return (error as { response?: { status?: number } })?.response?.status === 401
    || (error as { statusCode?: number })?.statusCode === 401
}

export async function fetchTwitchHelixWithTokenRetry<T>(fetchWithAccessToken: (accessToken: string) => Promise<T>): Promise<T> {
  const cachedAccessToken = await getTwitchAppAccessToken()
  try {
    return await fetchWithAccessToken(cachedAccessToken)
  } catch (error) {
    if (!isUnauthorizedFetchError(error)) throw error
    const freshAccessToken = await fetchFreshTwitchAppAccessToken()
    return await fetchWithAccessToken(freshAccessToken)
  }
}
