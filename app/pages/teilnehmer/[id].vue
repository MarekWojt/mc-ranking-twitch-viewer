<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

const route = useRoute()
const participantId = route.params.id as string

const { data: response, refresh } = await useFetch<DataWithFreshness<ParticipantDetailDto>>(`/api/participants/${participantId}`)

if (!response.value) {
  throw createError({ statusCode: 404, statusMessage: 'Teilnehmer nicht gefunden' })
}

useAutoRefresh(refresh, DATA_POLLING_INTERVAL_MILLISECONDS)

const participant = computed(() => response.value?.payload ?? null)
const dataAsOf = computed(() => response.value?.asOf ?? null)

const twitchChannelUrl = computed(() =>
  participant.value?.twitchLogin ? `https://twitch.tv/${participant.value.twitchLogin}` : null
)

const generalStatistics = computed(() =>
  (participant.value?.statistics ?? []).filter(statistic => statistic.group === 'allgemein')
)

const specificStatisticsSearchQuery = ref('')

const specificStatistics = computed(() => {
  const allSpecificStatistics = (participant.value?.statistics ?? []).filter(statistic => statistic.group === 'spezifisch')
  const searchQuery = specificStatisticsSearchQuery.value.trim().toLowerCase()
  if (searchQuery.length === 0) return allSpecificStatistics

  return allSpecificStatistics.filter(statistic =>
    `${statistic.groupLabel} ${statistic.label}`.toLowerCase().includes(searchQuery)
  )
})

const statisticTableColumns: TableColumn<ParticipantStatisticRowDto>[] = [
  { accessorKey: 'label', header: 'Statistik' },
  { accessorKey: 'displayValue', header: 'Wert' },
  { accessorKey: 'points', header: 'Punkte' }
]
</script>

<template>
  <UContainer
    v-if="participant"
    class="py-10 space-y-8"
  >
    <div class="flex flex-wrap items-stretch gap-6">
      <div class="w-64">
        <ParticipantCard :participant="participant" />
      </div>

      <div class="flex flex-1 flex-col items-end justify-between">
        <UButton
          v-if="twitchChannelUrl"
          :to="twitchChannelUrl"
          target="_blank"
          trailing-icon="i-lucide-arrow-up-right"
          size="sm"
          :color="participant.isLiveOnTwitch ? 'error' : 'neutral'"
          :variant="participant.isLiveOnTwitch ? 'solid' : 'subtle'"
        >
          {{ participant.isLiveOnTwitch ? 'Live auf Twitch' : 'zu Twitch' }}
        </UButton>
        <DataFreshnessNote :as-of="dataAsOf" />
      </div>
    </div>

    <section class="space-y-3">
      <h2 class="text-lg font-medium">
        Allgemein
      </h2>
      <UTable
        :data="generalStatistics"
        :columns="statisticTableColumns"
      >
        <template #points-cell="{ row }">
          {{ Math.round(row.original.points) }}
        </template>
      </UTable>
    </section>

    <section class="space-y-3">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h2 class="text-lg font-medium">
          Spezifisch
        </h2>
        <UInput
          v-model="specificStatisticsSearchQuery"
          icon="i-lucide-search"
          placeholder="Statistik suchen…"
        />
      </div>

      <UTable
        :data="specificStatistics"
        :columns="statisticTableColumns"
      >
        <template #label-cell="{ row }">
          {{ row.original.groupLabel }}: {{ row.original.label }}
        </template>

        <template #points-cell="{ row }">
          {{ Math.round(row.original.points) }}
        </template>
      </UTable>
    </section>
  </UContainer>
</template>
