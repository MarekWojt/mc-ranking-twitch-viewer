<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

const route = useRoute()
const participantId = route.params.id as string

const { data: participant } = await useFetch<ParticipantDetailDto>(`/api/participants/${participantId}`)

if (!participant.value) {
  throw createError({ statusCode: 404, statusMessage: 'Teilnehmer nicht gefunden' })
}

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
    <div class="flex flex-wrap items-center gap-3">
      <h1 class="text-2xl font-semibold">
        {{ participant.displayName }}
      </h1>
      <RankBadge :rank="participant.rank" />
      <TwitchLiveBadge v-if="participant.isLiveOnTwitch" />
      <MinecraftOnlineBadge v-if="participant.isOnlineOnMinecraftServer" />
      <UButton
        v-if="participant.twitchLogin"
        :to="`https://twitch.tv/${participant.twitchLogin}`"
        target="_blank"
        icon="i-simple-icons-twitch"
        color="neutral"
        variant="ghost"
        size="sm"
      >
        Twitch-Kanal
      </UButton>
    </div>

    <p class="text-muted">
      Gesamtpunktzahl: {{ Math.round(participant.totalScore) }}
    </p>

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
