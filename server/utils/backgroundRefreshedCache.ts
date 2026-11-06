const RETRY_DELAY_AFTER_FAILED_LOAD_MILLISECONDS = 5 * 60 * 1000

export type CachedValueLookup<Value>
  = | { status: 'stored', value: Value }
    | { status: 'loading' }
    | { status: 'failed', error: unknown }

export interface CachedValueLoadContext {
  // can still become true while the load waits for its turn, when someone starts waiting for its result
  isUrgent: boolean
}

export interface LookUpWithoutWaitingOptions {
  // a value that is missing to show something at all, as opposed to a refresh of a value that is only being confirmed
  isUrgent?: boolean
}

export interface BriefWaitForOutdatedValueOptions {
  outdatedAfterMilliseconds: number
  maxWaitMilliseconds: number
}

interface BackgroundRefreshedCacheOptions<Value> {
  describeValue: (key: string) => string
  load: (key: string, loadContext: CachedValueLoadContext) => Promise<Value>
  refreshIntervalMilliseconds: number
}

interface CacheEntry<Value> {
  stored?: { value: Value, loadedAt: number }
  pendingLoad?: Promise<void>
  pendingLoadStartedAt?: number
  pendingLoadContext?: CachedValueLoadContext
  lastFailure?: { error: unknown, failedAt: number }
}

// for values fetched over the network: a stored value is never dropped but served while a newer one loads in the background,
// so a slow or unreachable service never makes a page wait once a value is known; a failed load keeps the previous value and
// is retried after a pause instead of on every request
export function createBackgroundRefreshedCache<Value>({ describeValue, load, refreshIntervalMilliseconds }: BackgroundRefreshedCacheOptions<Value>) {
  const entriesByKey = new Map<string, CacheEntry<Value>>()

  function getOrCreateEntry(key: string): CacheEntry<Value> {
    let entry = entriesByKey.get(key)
    if (!entry) {
      entry = {}
      entriesByKey.set(key, entry)
    }
    return entry
  }

  function canStartLoad(entry: CacheEntry<Value>): boolean {
    if (entry.pendingLoad) return false
    return entry.lastFailure === undefined || Date.now() - entry.lastFailure.failedAt >= RETRY_DELAY_AFTER_FAILED_LOAD_MILLISECONDS
  }

  function isRefreshDue(entry: CacheEntry<Value>): boolean {
    return entry.stored === undefined || Date.now() - entry.stored.loadedAt >= refreshIntervalMilliseconds
  }

  function startLoad(key: string, entry: CacheEntry<Value>, loadContext: CachedValueLoadContext) {
    const hadStoredValue = entry.stored !== undefined
    entry.pendingLoadStartedAt = Date.now()
    entry.pendingLoadContext = loadContext
    entry.pendingLoad = load(key, loadContext)
      .then((value) => {
        entry.stored = { value, loadedAt: Date.now() }
        entry.lastFailure = undefined
      }, (error: unknown) => {
        entry.lastFailure = { error, failedAt: Date.now() }
        const keptValueNote = hadStoredValue ? 'der bisherige Wert bleibt bestehen, ' : ''
        const retryDelayMinutes = RETRY_DELAY_AFTER_FAILED_LOAD_MILLISECONDS / 60_000
        console.error(`${describeValue(key)} konnte nicht geladen werden, ${keptValueNote}nächster Versuch in ${retryDelayMinutes} Minuten:`, error)
      })
      .finally(() => {
        entry.pendingLoad = undefined
        entry.pendingLoadContext = undefined
      })
  }

  function takeStoredValueOrThrow(key: string, entry: CacheEntry<Value>): Value {
    if (entry.stored) return entry.stored.value
    throw entry.lastFailure?.error ?? new Error(`${describeValue(key)} wird noch geladen`)
  }

  function startLoadIfDue(key: string, entry: CacheEntry<Value>, { isUrgent = false }: LookUpWithoutWaitingOptions = {}) {
    const isValueMissingUrgently = isUrgent && entry.stored === undefined
    if (isValueMissingUrgently && entry.pendingLoadContext) entry.pendingLoadContext.isUrgent = true
    if (!canStartLoad(entry) || !isRefreshDue(entry)) return
    startLoad(key, entry, { isUrgent: isValueMissingUrgently })
  }

  function lookUpWithoutWaiting(key: string, lookUpOptions: LookUpWithoutWaitingOptions = {}): CachedValueLookup<Value> {
    const entry = getOrCreateEntry(key)
    startLoadIfDue(key, entry, lookUpOptions)
    if (entry.stored) return { status: 'stored', value: entry.stored.value }
    // checked before the pending load: callers skip a participant while a first answer is on its way, and if a retry counted as
    // that, a participant whose lookup keeps failing would disappear during every retry
    if (entry.lastFailure) return { status: 'failed', error: entry.lastFailure.error }
    return { status: 'loading' }
  }

  async function getStoredValueOrWaitForFirstLoad(key: string): Promise<Value> {
    const entry = getOrCreateEntry(key)
    startLoadIfDue(key, entry, { isUrgent: true })
    if (entry.stored) return entry.stored.value

    await entry.pendingLoad
    return takeStoredValueOrThrow(key, entry)
  }

  function waitForLoadAtMost(pendingLoad: Promise<void>, maxWaitMilliseconds: number): Promise<void> {
    return new Promise((resolve) => {
      const timeoutId = setTimeout(resolve, maxWaitMilliseconds)
      pendingLoad.then(() => {
        clearTimeout(timeoutId)
        resolve()
      })
    })
  }

  // refreshes only start with a request, so after a quiet time the stored value is as old as the pause and showing it would be
  // misleading; the exception to never waiting is limited to that case and to the first load after a restart, and the time counts
  // from the start of the load instead of per request, so a hanging service delays only the requests right at its start and never
  // the ones after them; without a value by then this throws, so the caller has to be able to answer without one
  async function getValueWaitingBrieflyIfOutdated(key: string, { outdatedAfterMilliseconds, maxWaitMilliseconds }: BriefWaitForOutdatedValueOptions): Promise<Value> {
    const entry = getOrCreateEntry(key)
    startLoadIfDue(key, entry, { isUrgent: true })
    const isOutdated = !entry.stored || Date.now() - entry.stored.loadedAt >= outdatedAfterMilliseconds
    if (isOutdated && entry.pendingLoad) {
      const remainingWaitMilliseconds = entry.pendingLoadStartedAt! + maxWaitMilliseconds - Date.now()
      if (remainingWaitMilliseconds > 0) await waitForLoadAtMost(entry.pendingLoad, remainingWaitMilliseconds)
    }
    return takeStoredValueOrThrow(key, entry)
  }

  function refreshInBackground(key: string) {
    const entry = getOrCreateEntry(key)
    if (canStartLoad(entry)) startLoad(key, entry, { isUrgent: false })
  }

  return { lookUpWithoutWaiting, getStoredValueOrWaitForFirstLoad, getValueWaitingBrieflyIfOutdated, refreshInBackground }
}
