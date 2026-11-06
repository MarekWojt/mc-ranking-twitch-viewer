// a proxy that buffers the stream delivers nothing at all, so the pages have to notice that and keep polling instead of going stale
const FIRST_MESSAGE_TIMEOUT_MILLISECONDS = 3_000
// the server sends a heartbeat every 25 s
const SILENCE_TIMEOUT_MILLISECONDS = 60_000
const RECONNECT_DELAY_MILLISECONDS = 30_000

type LiveUpdateStreamState = 'connecting' | 'working' | 'broken'

// one connection per tab shared by all pages of the visit; only ever written in the browser
const latestLiveUpdate = shallowRef<LiveUpdateDto | null>(null)
const liveUpdateStreamState = shallowRef<LiveUpdateStreamState>('connecting')
let eventSource: EventSource | null = null
let streamHealthTimeoutId: ReturnType<typeof setTimeout> | undefined
let reconnectTimeoutId: ReturnType<typeof setTimeout> | undefined
let hasStartedLiveUpdateStream = false

function disconnectFromLiveUpdates() {
  eventSource?.close()
  eventSource = null
  clearTimeout(streamHealthTimeoutId)
  clearTimeout(reconnectTimeoutId)
}

function treatStreamAsBrokenAndReconnectLater() {
  disconnectFromLiveUpdates()
  liveUpdateStreamState.value = 'broken'
  reconnectTimeoutId = setTimeout(connectToLiveUpdates, RECONNECT_DELAY_MILLISECONDS)
}

// stays connected, because a server that has just restarted can need longer than this for its first message
function pollWhileStillWaitingForFirstMessage() {
  liveUpdateStreamState.value = 'broken'
  streamHealthTimeoutId = setTimeout(treatStreamAsBrokenAndReconnectLater, SILENCE_TIMEOUT_MILLISECONDS)
}

function connectToLiveUpdates() {
  disconnectFromLiveUpdates()
  // a stream that was already broken keeps counting as broken until it delivers, so polling does not pause for every attempt
  if (liveUpdateStreamState.value !== 'broken') liveUpdateStreamState.value = 'connecting'
  streamHealthTimeoutId = setTimeout(pollWhileStillWaitingForFirstMessage, FIRST_MESSAGE_TIMEOUT_MILLISECONDS)

  eventSource = new EventSource('/api/updates')
  eventSource.onmessage = ({ data }) => {
    latestLiveUpdate.value = JSON.parse(data) as LiveUpdateDto
    liveUpdateStreamState.value = 'working'
    clearTimeout(streamHealthTimeoutId)
    streamHealthTimeoutId = setTimeout(treatStreamAsBrokenAndReconnectLater, SILENCE_TIMEOUT_MILLISECONDS)
  }
  eventSource.onerror = () => {
    // browsers reconnect on their own after a lost connection, but give up for good after an error response like a 502 during a deploy
    if (eventSource?.readyState === EventSource.CLOSED) treatStreamAsBrokenAndReconnectLater()
  }
}

function connectOnlyWhileVisible() {
  if (document.visibilityState === 'visible') connectToLiveUpdates()
  else disconnectFromLiveUpdates()
}

export function areDataVersionsCurrent(loadedDataVersions: DataVersions | undefined, { dataVersions }: LiveUpdateDto): boolean {
  if (!loadedDataVersions) return false
  return (Object.entries(loadedDataVersions) as [DataVersionTopic, string | undefined][])
    .every(([topic, loadedVersion]) => dataVersions[topic] === loadedVersion)
}

export function useLiveUpdateStream() {
  function startLiveUpdateStream() {
    if (hasStartedLiveUpdateStream) return
    hasStartedLiveUpdateStream = true
    document.addEventListener('visibilitychange', connectOnlyWhileVisible)
    connectOnlyWhileVisible()
  }

  return { latestLiveUpdate, liveUpdateStreamState, startLiveUpdateStream }
}
