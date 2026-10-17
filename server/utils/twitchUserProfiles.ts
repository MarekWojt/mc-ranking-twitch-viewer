import { createHash } from 'node:crypto'
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
    }
  }))
  return response.data
}

const twitchDisplayNameFromLoginCacheOptions = {
  name: 'twitch-display-name-from-login',
  getKey: (twitchLogin: string) => twitchLogin.toLowerCase(),
  maxAge: 60 * 60 * 24
}

export const resolveTwitchDisplayNameFromLogin = defineCachedFunction(async (twitchLogin: string): Promise<string> => {
  const [profile] = await fetchUserProfilesBatch([twitchLogin])
  if (!profile) throw new Error(`Twitch-Nutzer "${twitchLogin}" wurde nicht gefunden`)
  return profile.display_name
}, twitchDisplayNameFromLoginCacheOptions)

const LAST_KNOWN_TWITCH_PROFILE_IMAGE_URLS_FILE_PATH = resolve(process.cwd(), '.data/twitch-profile-image-urls.json')

const twitchUserProfileCacheOptions = {
  name: 'twitch-user-profiles',
  // keyed by the login list, so participants added to participants.toml get their picture right away instead of after
  // the cached list of everyone else expires
  getKey: (twitchLogins: string[]) => createHash('sha256').update(twitchLogins.join('\n')).digest('hex'),
  maxAge: 60 * 60
}

const fetchTwitchProfileImageUrlsByLogin = defineCachedFunction(async (twitchLogins: string[]): Promise<TimestampedValue<Record<string, string>>> => {
  if (twitchLogins.length === 0) return { value: {}, fetchedAt: new Date().toISOString() }

  const batches = splitIntoBatches(twitchLogins, TWITCH_HELIX_LOGIN_BATCH_SIZE)
  const batchResults = await Promise.all(batches.map(fetchUserProfilesBatch))

  const profileImageUrlByTwitchLogin = Object.fromEntries(
    batchResults.flat().map(entry => [entry.login.toLowerCase(), entry.profile_image_url])
  )
  const profileImageUrls = { value: profileImageUrlByTwitchLogin, fetchedAt: new Date().toISOString() }
  await mkdir(dirname(LAST_KNOWN_TWITCH_PROFILE_IMAGE_URLS_FILE_PATH), { recursive: true })
  await writeFile(LAST_KNOWN_TWITCH_PROFILE_IMAGE_URLS_FILE_PATH, JSON.stringify(profileImageUrls))
  return profileImageUrls
}, twitchUserProfileCacheOptions)

async function readLastKnownTwitchProfileImageUrls(): Promise<TimestampedValue<Record<string, string>> | null> {
  try {
    return JSON.parse(await readFile(LAST_KNOWN_TWITCH_PROFILE_IMAGE_URLS_FILE_PATH, 'utf8')) as TimestampedValue<Record<string, string>>
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw error
  }
}

// without this a Twitch outage (or a request right after a restart failing) replaces every profile picture with a placeholder
export async function getTwitchProfileImageUrlsByLogin(): Promise<TimestampedValue<Record<string, string>>> {
  const { value: participants } = await loadParticipants()
  const sortedTwitchLogins = [...new Set(
    participants
      .map(participant => participant.twitchLogin?.toLowerCase())
      .filter((twitchLogin): twitchLogin is string => twitchLogin !== undefined)
  )].sort()
  try {
    return await fetchTwitchProfileImageUrlsByLogin(sortedTwitchLogins)
  } catch (error) {
    const lastKnownProfileImageUrls = await readLastKnownTwitchProfileImageUrls()
    if (!lastKnownProfileImageUrls) throw error
    console.error('Twitch-Profilbilder konnten nicht abgerufen werden, nutze die zuletzt bekannten:', error)
    return lastKnownProfileImageUrls
  }
}
