<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

const route = useRoute()
const statisticSlug = route.params.slug as string

const { data: statistic } = await useFetch<StatisticDetailDto>(`/api/statistics/${statisticSlug}`)

if (!statistic.value) {
  throw createError({ statusCode: 404, statusMessage: 'Statistik nicht gefunden' })
}

const statisticParticipantTableColumns: TableColumn<StatisticParticipantRowDto>[] = [
  { accessorKey: 'displayName', header: 'Teilnehmer' },
  { accessorKey: 'displayValue', header: 'Wert' },
  { accessorKey: 'points', header: 'Punkte' }
]

function openParticipantDetail(_event: Event, row: { original: StatisticParticipantRowDto }) {
  navigateTo(`/teilnehmer/${row.original.participantId}`)
}
</script>

<template>
  <UContainer
    v-if="statistic"
    class="py-10 space-y-6"
  >
    <h1 class="text-2xl font-semibold">
      <span v-if="statistic.groupLabel">{{ statistic.groupLabel }}: </span>{{ statistic.label }}
    </h1>

    <UTable
      :data="statistic.participants"
      :columns="statisticParticipantTableColumns"
      @select="openParticipantDetail"
    >
      <template #displayName-cell="{ row }">
        <span class="font-medium">{{ row.original.displayName }}</span>
      </template>

      <template #points-cell="{ row }">
        {{ Math.round(row.original.points) }}
      </template>
    </UTable>
  </UContainer>
</template>
