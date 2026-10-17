const PARTICIPANT_LIST_DATA_KEY = 'participant-list'

function useParticipantListFetchedAt() {
  return useState<number | null>('participant-list-fetched-at', () => null)
}

// not async: lifecycle hooks registered after an await inside a composable lose their component and are silently
// dropped, so the auto refresh has to be set up before the caller awaits the request
export function usePolledParticipantList() {
  const fetchedAt = useParticipantListFetchedAt()
  const apiCacheBustingQuery = useApiCacheBustingQuery()
  const participantListRequest = useAsyncData(PARTICIPANT_LIST_DATA_KEY, async (nuxtApp, { signal }) => {
    const previousResponse = nuxtApp.payload.data[PARTICIPANT_LIST_DATA_KEY] as DataWithFreshness<ParticipantListItemDto[]> | undefined
    try {
      const response = await $fetch<DataWithFreshness<ParticipantListItemDto[]>>('/api/participants', { signal, query: apiCacheBustingQuery })
      fetchedAt.value = Date.now()
      return response
    } catch (error) {
      // Nuxt empties the data when a refresh fails (e.g. while the server restarts), which would blank the list until the
      // next successful poll; the freshness note still shows how old the kept list is
      if (previousResponse && !signal.aborted) return previousResponse
      throw error
    }
  })
  useAutoRefresh(participantListRequest.refresh, DATA_POLLING_INTERVAL_MILLISECONDS)

  return participantListRequest
}

export function useRecentParticipantList() {
  const { data } = useNuxtData<DataWithFreshness<ParticipantListItemDto[]>>(PARTICIPANT_LIST_DATA_KEY)
  const fetchedAt = useParticipantListFetchedAt()
  const apiCacheBustingQuery = useApiCacheBustingQuery()
  const isLoading = ref(false)

  const participants = computed(() => data.value?.payload ?? [])

  function isOlderThanPollingInterval(): boolean {
    return fetchedAt.value === null || Date.now() - fetchedAt.value > DATA_POLLING_INTERVAL_MILLISECONDS
  }

  // pages like the homepage already poll this list; only pages without it (or a stale copy) need an extra request
  async function ensureRecentParticipants() {
    if (data.value && !isOlderThanPollingInterval()) return

    isLoading.value = true
    try {
      data.value = await $fetch<DataWithFreshness<ParticipantListItemDto[]>>('/api/participants', { query: apiCacheBustingQuery })
      fetchedAt.value = Date.now()
    } finally {
      isLoading.value = false
    }
  }

  return { participants, isLoading, ensureRecentParticipants }
}
