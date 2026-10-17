<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

const route = useRoute()
const statisticSlug = route.params.slug as string

const { data: response, refresh } = await useApiFetch<DataWithFreshness<StatisticDetailDto>>(`/api/statistics/${statisticSlug}`)

if (!response.value) {
  throw createError({ statusCode: 404, statusMessage: 'Statistik nicht gefunden' })
}

useAutoRefresh(refresh, DATA_POLLING_INTERVAL_MILLISECONDS)

const { resolvedObjectsLocale, resolvedStatisticsLocale } = useMinecraftNameLocale()

const statistic = computed(() => {
  const rawStatistic = response.value?.payload
  if (!rawStatistic) return null

  return {
    ...rawStatistic,
    ...resolveStatisticLabelAndGroupLabel(rawStatistic, resolvedObjectsLocale.value, resolvedStatisticsLocale.value)
  }
})
const dataAsOf = computed(() => response.value?.asOf ?? null)

const TOTALS_ROW_PARTICIPANT_ID = '__totals__'

const statisticParticipantTableColumns: TableColumn<StatisticParticipantRowDto>[] = [
  { accessorKey: 'displayName', header: 'Teilnehmer' },
  {
    accessorKey: 'rank',
    header: 'Platz',
    meta: { class: { th: 'w-px whitespace-nowrap', td: 'w-px whitespace-nowrap' } },
    cell: ({ row }) => row.original.participantId === TOTALS_ROW_PARTICIPANT_ID
      ? null
      : h('span', { class: 'text-xs text-muted tabular-nums' }, `#${row.original.rank}`)
  },
  { accessorKey: 'displayValue', header: 'Wert', meta: { class: { th: 'w-px whitespace-nowrap text-right', td: 'w-px whitespace-nowrap text-right' } } },
  {
    accessorKey: 'points',
    header: 'Punkte',
    meta: { class: { th: 'w-px whitespace-nowrap text-right', td: 'w-px whitespace-nowrap text-right' } },
    cell: ({ row }) => renderWeightedPoints(row.original.points, row.original.pointsWithoutStatisticWeight, statistic.value?.weight ?? DEFAULT_STATISTIC_WEIGHT)
  }
]

const participantRows = computed<StatisticParticipantRowDto[]>(() => {
  if (!statistic.value) return []

  const totalsRow: StatisticParticipantRowDto = {
    participantId: TOTALS_ROW_PARTICIPANT_ID,
    displayName: 'Gesamt',
    minecraftUuid: '',
    value: statistic.value.totalValue,
    displayValue: statistic.value.totalDisplayValue,
    points: statistic.value.totalPoints,
    pointsWithoutStatisticWeight: statistic.value.totalPointsWithoutStatisticWeight,
    rank: 0
  }

  return [totalsRow, ...statistic.value.participants]
})

const participantTableRowMeta = {
  class: {
    tr: (row: { original: StatisticParticipantRowDto }) =>
      row.original.participantId === TOTALS_ROW_PARTICIPANT_ID ? 'border-b-2 border-default' : ''
  }
}

function openParticipantDetail(_event: Event, row: { original: StatisticParticipantRowDto }) {
  if (row.original.participantId === TOTALS_ROW_PARTICIPANT_ID) return
  navigateTo(`/teilnehmer/${row.original.participantId}`)
}
</script>

<template>
  <UContainer
    v-if="statistic"
    class="py-10 space-y-6"
  >
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <h1 class="text-2xl font-semibold">
          {{ statistic.label }}
        </h1>
        <UBadge
          v-if="statistic.weight !== DEFAULT_STATISTIC_WEIGHT"
          :label="formatStatisticWeight(statistic.weight)"
          :color="resolveStatisticWeightBadgeColor(statistic.weight)"
          variant="subtle"
          class="tabular-nums"
          :title="describeStatisticWeight(statistic.weight)"
        />
      </div>
      <DataFreshnessNote :as-of="dataAsOf" />
    </div>

    <UTable
      :data="participantRows"
      :columns="statisticParticipantTableColumns"
      :meta="participantTableRowMeta"
      :get-row-id="(row: StatisticParticipantRowDto) => row.participantId"
      :row-pinning="{ top: [TOTALS_ROW_PARTICIPANT_ID] }"
      @select="openParticipantDetail"
    >
      <template #displayName-cell="{ row }">
        <span
          v-if="row.original.participantId === TOTALS_ROW_PARTICIPANT_ID"
          class="font-medium"
        >Gesamt</span>
        <div
          v-else
          class="flex items-center gap-2"
        >
          <img
            :src="buildMinecraftAvatarRenderUrl(row.original.minecraftUuid, 'avatar')"
            :alt="row.original.displayName"
            class="size-6 rounded"
            loading="lazy"
            @error="(event: Event) => { (event.target as HTMLImageElement).style.display = 'none' }"
          >
          <span class="font-medium">{{ row.original.displayName }}</span>
        </div>
      </template>
    </UTable>
  </UContainer>
</template>
