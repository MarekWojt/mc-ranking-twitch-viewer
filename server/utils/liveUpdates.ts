const CHANGE_CHECK_INTERVAL_MILLISECONDS = 2_000
// keeps the connection alive behind a proxy and tells browsers that the stream still works; must stay well below the silence
// after which useLiveUpdateStream gives up on the stream and proxy read timeouts, which are usually 60 s
const HEARTBEAT_INTERVAL_MILLISECONDS = 25_000

export interface LiveUpdateSubscriber {
  receive: (liveUpdate: LiveUpdateDto) => void
  close: () => void
}

const liveUpdateSubscribers = new Set<LiveUpdateSubscriber>()
let isChangeCheckScheduled = false
let lastBroadcastDataVersions: string | undefined
let lastBroadcastAt = 0

async function loadCurrentLiveUpdate(): Promise<LiveUpdateDto> {
  const [scoreboard, iconBundleVersion] = await Promise.all([getScoreboard(), getStoredMinecraftIconBundleVersion()])
  return {
    asOf: scoreboard.asOf,
    dataVersions: { scores: scoreboard.scoresVersion, status: scoreboard.statusVersion, iconBundle: iconBundleVersion }
  }
}

async function broadcastIfChangedOrHeartbeatDue() {
  const liveUpdate = await loadCurrentLiveUpdate()
  const dataVersions = JSON.stringify(liveUpdate.dataVersions)
  if (dataVersions === lastBroadcastDataVersions && Date.now() - lastBroadcastAt < HEARTBEAT_INTERVAL_MILLISECONDS) return

  lastBroadcastDataVersions = dataVersions
  lastBroadcastAt = Date.now()
  for (const subscriber of liveUpdateSubscribers) subscriber.receive(liveUpdate)
}

// these checks are also what keeps the data current: Twitch is only asked and stats files are only read while someone is connected
async function checkForChangesWhileAnyoneListens() {
  try {
    await broadcastIfChangedOrHeartbeatDue()
  } catch (error) {
    console.error('Live-Updates konnten nicht geprüft werden, es wird gleich erneut versucht:', error)
  }

  if (liveUpdateSubscribers.size > 0) {
    setTimeout(checkForChangesWhileAnyoneListens, CHANGE_CHECK_INTERVAL_MILLISECONDS)
  } else {
    isChangeCheckScheduled = false
  }
}

export function subscribeToLiveUpdates(subscriber: LiveUpdateSubscriber): () => void {
  liveUpdateSubscribers.add(subscriber)

  // a new tab compares this with the versions of the data it just loaded, so it notices anything that changed in the meantime
  loadCurrentLiveUpdate().then(subscriber.receive).catch((error) => {
    console.error('Erstes Live-Update konnte nicht geladen werden, das nächste folgt beim nächsten Durchlauf:', error)
  })

  if (!isChangeCheckScheduled) {
    isChangeCheckScheduled = true
    setTimeout(checkForChangesWhileAnyoneListens, CHANGE_CHECK_INTERVAL_MILLISECONDS)
  }

  return () => liveUpdateSubscribers.delete(subscriber)
}

export function closeAllLiveUpdateSubscribers() {
  for (const subscriber of liveUpdateSubscribers) subscriber.close()
}
