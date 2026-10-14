const PARTICIPANT_LIST_DATA_KEY = 'participant-list'

function useParticipantListFetchedAt() {
  return useState<number | null>('participant-list-fetched-at', () => null)
}

export async function usePolledParticipantList() {
  const fetchedAt = useParticipantListFetchedAt()
  const { data, refresh } = await useFetch<DataWithFreshness<ParticipantListItemDto[]>>('/api/participants', {
    key: PARTICIPANT_LIST_DATA_KEY,
    onResponse() {
      fetchedAt.value = Date.now()
    }
  })
  useAutoRefresh(refresh, DATA_POLLING_INTERVAL_MILLISECONDS)

  return data
}

export function useRecentParticipantList() {
  const { data } = useNuxtData<DataWithFreshness<ParticipantListItemDto[]>>(PARTICIPANT_LIST_DATA_KEY)
  const fetchedAt = useParticipantListFetchedAt()
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
      data.value = await $fetch<DataWithFreshness<ParticipantListItemDto[]>>('/api/participants')
      fetchedAt.value = Date.now()
    } finally {
      isLoading.value = false
    }
  }

  return { participants, isLoading, ensureRecentParticipants }
}
