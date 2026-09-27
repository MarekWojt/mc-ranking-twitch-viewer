<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

const { data: response, refresh } = await useFetch<DataWithFreshness<ParticipantListItemDto[]>>('/api/participants')
useAutoRefresh(refresh, DATA_POLLING_INTERVAL_MILLISECONDS)

const participants = computed(() => response.value?.payload ?? [])
const dataAsOf = computed(() => response.value?.asOf ?? null)

const podiumRanks = computed(() => {
  const distinctRanksAscending = [...new Set(participants.value.map(participant => participant.rank))].sort((a, b) => a - b)
  return distinctRanksAscending.slice(0, 3)
})

const podiumGroups = computed(() =>
  podiumRanks.value.map(rank => ({
    rank,
    participants: participants.value.filter(participant => participant.rank === rank)
  }))
)

const remainingParticipants = computed(() =>
  participants.value.filter(participant => !podiumRanks.value.includes(participant.rank))
)

const rankingTableColumns: TableColumn<ParticipantListItemDto>[] = [
  { accessorKey: 'rank', header: 'Rang' },
  { accessorKey: 'displayName', header: 'Teilnehmer' },
  { accessorKey: 'totalScore', header: 'Punkte' },
  { id: 'twitch', header: 'Twitch' }
]

function openParticipantDetail(_event: Event, row: { original: ParticipantListItemDto }) {
  navigateTo(`/teilnehmer/${row.original.id}`)
}
</script>

<template>
  <UContainer class="py-10 space-y-10">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-2xl font-semibold">
        Rangliste
      </h1>
      <DataFreshnessNote :as-of="dataAsOf" />
    </div>

    <div class="grid gap-4 sm:grid-cols-3">
      <UCard
        v-for="podiumGroup in podiumGroups"
        :key="podiumGroup.rank"
      >
        <template #header>
          <span class="text-lg font-semibold">#{{ podiumGroup.rank }}</span>
        </template>

        <ul class="space-y-2">
          <li
            v-for="participant in podiumGroup.participants"
            :key="participant.id"
          >
            <NuxtLink
              :to="`/teilnehmer/${participant.id}`"
              class="font-medium hover:text-primary"
            >
              {{ participant.displayName }}
            </NuxtLink>
            <span class="text-muted"> · {{ Math.round(participant.totalScore) }} Punkte</span>
          </li>
        </ul>
      </UCard>
    </div>

    <UTable
      :data="remainingParticipants"
      :columns="rankingTableColumns"
      @select="openParticipantDetail"
    >
      <template #rank-cell="{ row }">
        <RankBadge :rank="row.original.rank" />
      </template>

      <template #displayName-cell="{ row }">
        <span class="font-medium">{{ row.original.displayName }}</span>
      </template>

      <template #totalScore-cell="{ row }">
        {{ Math.round(row.original.totalScore) }}
      </template>

      <template #twitch-cell="{ row }">
        <UButton
          v-if="row.original.twitchLogin"
          :to="`https://twitch.tv/${row.original.twitchLogin}`"
          target="_blank"
          icon="i-simple-icons-twitch"
          color="neutral"
          variant="ghost"
          size="sm"
          aria-label="Twitch-Kanal öffnen"
          @click.stop
        />
      </template>
    </UTable>
  </UContainer>
</template>
