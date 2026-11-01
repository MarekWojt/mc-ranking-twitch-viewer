import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

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
    },
    timeout: EXTERNAL_REQUEST_TIMEOUT_MILLISECONDS
  }))
  return response.data
}

async function fetchTwitchDisplayName(twitchLogin: string): Promise<string> {
  const [profile] = await fetchUserProfilesBatch([twitchLogin])
  if (!profile) throw new Error(`Twitch-Nutzer "${twitchLogin}" wurde nicht gefunden`)
  return profile.display_name
}

const twitchDisplayNameByLoginCache = createBackgroundRefreshedCache<string>({
  describeValue: twitchLogin => `Twitch-Anzeigename von "${twitchLogin}"`,
  load: fetchTwitchDisplayName,
  // a found display name is written into participants.toml, so it is never looked up again
  refreshIntervalMilliseconds: Number.POSITIVE_INFINITY
})

export function lookUpTwitchDisplayNameWithoutWaiting(twitchLogin: string): CachedValueLookup<string> {
  return twitchDisplayNameByLoginCache.lookUpWithoutWaiting(twitchLogin.toLowerCase())
}

const LAST_KNOWN_TWITCH_PROFILE_IMAGE_URLS_FILE_PATH = resolve(process.cwd(), '.data/twitch-profile-image-urls.json')

interface TwitchProfileImageUrlsLoad {
  requestedTwitchLogins: string[]
  profileImageUrls: TimestampedValue<Record<string, string>>
}

async function fetchProfileImageUrlsOfParticipants(): Promise<TwitchProfileImageUrlsLoad> {
  const requestedTwitchLogins = await loadSortedParticipantTwitchLogins()
  const batchResults = await Promise.all(splitIntoBatches(requestedTwitchLogins, TWITCH_HELIX_LOGIN_BATCH_SIZE).map(fetchUserProfilesBatch))

  const profileImageUrlByTwitchLogin = Object.fromEntries(
    batchResults.flat().map(entry => [entry.login.toLowerCase(), entry.profile_image_url])
  )
  const profileImageUrls = { value: profileImageUrlByTwitchLogin, fetchedAt: new Date().toISOString() }
  await mkdir(dirname(LAST_KNOWN_TWITCH_PROFILE_IMAGE_URLS_FILE_PATH), { recursive: true })
  await writeFile(LAST_KNOWN_TWITCH_PROFILE_IMAGE_URLS_FILE_PATH, JSON.stringify(profileImageUrls))
  return { requestedTwitchLogins, profileImageUrls }
}

const twitchProfileImageUrlsCache = createBackgroundRefreshedCache<TwitchProfileImageUrlsLoad>({
  describeValue: () => 'Twitch-Profilbilder',
  load: fetchProfileImageUrlsOfParticipants,
  refreshIntervalMilliseconds: 60 * 60 * 1000
})

async function readLastKnownTwitchProfileImageUrls(): Promise<TimestampedValue<Record<string, string>> | null> {
  try {
    return JSON.parse(await readFile(LAST_KNOWN_TWITCH_PROFILE_IMAGE_URLS_FILE_PATH, 'utf8')) as TimestampedValue<Record<string, string>>
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw error
  }
}

export async function getTwitchProfileImageUrlsByLogin(): Promise<TimestampedValue<Record<string, string>>> {
  let profileImageUrlsLoad: TwitchProfileImageUrlsLoad
  try {
    profileImageUrlsLoad = await twitchProfileImageUrlsCache.getStoredValueOrWaitForFirstLoad('all')
  } catch (error) {
    // without this a Twitch outage right after a restart would replace every profile picture with a placeholder
    const lastKnownProfileImageUrls = await readLastKnownTwitchProfileImageUrls()
    if (!lastKnownProfileImageUrls) throw error
    return lastKnownProfileImageUrls
  }

  // participants added to participants.toml get their picture with one of the next requests instead of after an hour
  const currentTwitchLogins = await loadSortedParticipantTwitchLogins()
  if (currentTwitchLogins.join('\n') !== profileImageUrlsLoad.requestedTwitchLogins.join('\n')) {
    twitchProfileImageUrlsCache.refreshInBackground('all')
  }
  return profileImageUrlsLoad.profileImageUrls
}
