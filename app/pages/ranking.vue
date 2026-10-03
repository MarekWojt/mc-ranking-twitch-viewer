<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

const { data: response, refresh } = await useFetch<DataWithFreshness<ParticipantListItemDto[]>>('/api/participants')
useAutoRefresh(refresh, DATA_POLLING_INTERVAL_MILLISECONDS)

const { data: avatarBundle } = await useMinecraftAvatarBundle()

const participants = computed(() => response.value?.payload ?? [])
const dataAsOf = computed(() => response.value?.asOf ?? null)

function findMinecraftHeadRenderSrc(minecraftUuid: string): string | null {
  return avatarBundle.value?.headRendersByMinecraftUuid[minecraftUuid] ?? null
}

const podiumRanks = computed(() => {
  const distinctRanksAscending = [...new Set(participants.value.map(participant => participant.rank))].sort((a, b) => a - b)
  return distinctRanksAscending.slice(0, 3)
})

const podiumParticipants = computed(() =>
  participants.value.filter(participant => podiumRanks.value.includes(participant.rank))
)

const remainingParticipants = computed(() =>
  participants.value.filter(participant => !podiumRanks.value.includes(participant.rank))
)

const rankingTableColumns: TableColumn<ParticipantListItemDto>[] = [
  { accessorKey: 'rank', header: 'Rang' },
  { accessorKey: 'displayName', header: 'Teilnehmer' },
  { accessorKey: 'totalScore', header: 'Punkte' },
  { accessorKey: 'percentOfLeaderScore', header: '% von Platz 1' },
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

    <div class="grid grid-cols-[repeat(auto-fit,minmax(min(200px,100%),1fr))] gap-4">
      <ParticipantCard
        v-for="participant in podiumParticipants"
        :key="participant.id"
        :participant="participant"
        show-percent-of-leader
      />
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
        <div class="flex items-center gap-2">
          <img
            v-if="findMinecraftHeadRenderSrc(row.original.minecraftUuid)"
            :src="findMinecraftHeadRenderSrc(row.original.minecraftUuid)!"
            :alt="`Minecraft-Kopf von ${row.original.displayName}`"
            class="size-8 rounded"
          >
          <UIcon
            v-else
            name="i-lucide-user-round"
            class="size-8 shrink-0 rounded text-muted"
          />
          <img
            v-if="row.original.twitchProfileImageUrl"
            :src="row.original.twitchProfileImageUrl"
            :alt="`Twitch-Profilbild von ${row.original.displayName}`"
            class="size-5 shrink-0 rounded-full"
          >
          <UIcon
            v-else-if="row.original.twitchLogin"
            name="i-simple-icons-twitch"
            class="size-4 shrink-0 text-muted"
          />
          <span class="font-medium">{{ row.original.displayName }}</span>
        </div>
      </template>

      <template #totalScore-cell="{ row }">
        {{ Math.round(row.original.totalScore) }}
      </template>

      <template #percentOfLeaderScore-cell="{ row }">
        {{ row.original.percentOfLeaderScore.toFixed(1) }}%
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
