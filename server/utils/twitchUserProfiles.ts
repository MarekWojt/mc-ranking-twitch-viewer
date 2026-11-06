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

async function readLastKnownTwitchProfileImageUrls(): Promise<TimestampedValue<Record<string, string>> | null> {
  try {
    return JSON.parse(await readFile(LAST_KNOWN_TWITCH_PROFILE_IMAGE_URLS_FILE_PATH, 'utf8')) as TimestampedValue<Record<string, string>>
  } catch (error) {
    // read on every restart: a file damaged by a crash while writing must not cost more than the pictures it held
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') console.error('Gespeicherte Twitch-Profilbilder konnten nicht gelesen werden:', error)
    return null
  }
}

// the requested list is temporarily shorter or even empty while entries of participants.toml are skipped, and that must not
// lose pictures that are needed after a restart
async function addToLastKnownTwitchProfileImageUrls({ value, fetchedAt }: TimestampedValue<Record<string, string>>): Promise<void> {
  const lastKnownProfileImageUrls = await readLastKnownTwitchProfileImageUrls()
  await mkdir(dirname(LAST_KNOWN_TWITCH_PROFILE_IMAGE_URLS_FILE_PATH), { recursive: true })
  await writeFile(LAST_KNOWN_TWITCH_PROFILE_IMAGE_URLS_FILE_PATH, JSON.stringify({ value: { ...lastKnownProfileImageUrls?.value, ...value }, fetchedAt }))
}

async function fetchProfileImageUrlsOfParticipants(): Promise<TwitchProfileImageUrlsLoad> {
  const requestedTwitchLogins = await loadSortedParticipantTwitchLogins()
  const batchResults = await Promise.all(splitIntoBatches(requestedTwitchLogins, TWITCH_HELIX_LOGIN_BATCH_SIZE).map(fetchUserProfilesBatch))

  const profileImageUrlByTwitchLogin = Object.fromEntries(
    batchResults.flat().map(entry => [entry.login.toLowerCase(), entry.profile_image_url])
  )
  const profileImageUrls = { value: profileImageUrlByTwitchLogin, fetchedAt: new Date().toISOString() }
  await addToLastKnownTwitchProfileImageUrls(profileImageUrls)
  return { requestedTwitchLogins, profileImageUrls }
}

const twitchProfileImageUrlsCache = createBackgroundRefreshedCache<TwitchProfileImageUrlsLoad>({
  describeValue: () => 'Twitch-Profilbilder',
  load: fetchProfileImageUrlsOfParticipants,
  refreshIntervalMilliseconds: 60 * 60 * 1000
})

export async function getTwitchProfileImageUrlsByLogin(): Promise<TimestampedValue<Record<string, string>>> {
  const profileImageUrlsLookup = twitchProfileImageUrlsCache.lookUpWithoutWaiting('all')
  if (profileImageUrlsLookup.status !== 'stored') {
    // right after a restart the pictures on disk are good enough, so a slow Twitch cannot make the first page wait for them
    const lastKnownProfileImageUrls = await readLastKnownTwitchProfileImageUrls()
    if (lastKnownProfileImageUrls) return lastKnownProfileImageUrls
    return (await twitchProfileImageUrlsCache.getStoredValueOrWaitForFirstLoad('all')).profileImageUrls
  }

  // participants added to participants.toml get their picture with one of the next requests instead of after an hour
  const currentTwitchLogins = await loadSortedParticipantTwitchLogins()
  if (currentTwitchLogins.join('\n') !== profileImageUrlsLookup.value.requestedTwitchLogins.join('\n')) {
    twitchProfileImageUrlsCache.refreshInBackground('all')
  }
  return profileImageUrlsLookup.value.profileImageUrls
}
