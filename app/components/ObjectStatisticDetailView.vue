<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

const props = defineProps<{
  kind: SpecificStatisticSubgroup
  bareKey: string
}>()

const { data: response, refresh } = await useFetch<DataWithFreshness<ObjectStatisticDetailDto>>(
  () => `/api/statistics/${props.kind}/${props.bareKey}`
)

if (!response.value) {
  throw createError({ statusCode: 404, statusMessage: props.kind === 'items' ? 'Item nicht gefunden' : 'Entity nicht gefunden' })
}

useAutoRefresh(refresh, DATA_POLLING_INTERVAL_MILLISECONDS)

const detail = computed(() => response.value?.payload ?? null)
const dataAsOf = computed(() => response.value?.asOf ?? null)

const { data: iconBundle } = await useFetch<MinecraftIconBundleDto>('/api/icons/minecraft-bundle')

const iconSrc = computed(() => props.kind === 'items'
  ? iconBundle.value?.itemIconsByBareId[props.bareKey] ?? null
  : iconBundle.value?.entityIconsByBareId[props.bareKey] ?? null)

const actionIconByLabel = computed(() => props.kind === 'items' ? ITEM_ACTION_ICON_BY_LABEL : ENTITY_ACTION_ICON_BY_LABEL)

const actionLabels = computed(() => {
  const labels = new Set<string>()
  for (const participant of detail.value?.participants ?? []) {
    for (const label of Object.keys(participant.valueByActionLabel)) labels.add(label)
  }
  return [...labels].sort()
})

const TOTALS_ROW_PARTICIPANT_ID = '__totals__'

type StatDisplayMode = 'value' | 'points'

const statDisplayMode = ref<StatDisplayMode>('value')

const tableColumns = computed<TableColumn<ObjectStatisticParticipantRowDto>[]>(() => {
  const displayMode = statDisplayMode.value

  return [
    { accessorKey: 'displayName', header: 'Spieler', enableSorting: false },
    ...actionLabels.value.map((actionLabel): TableColumn<ObjectStatisticParticipantRowDto> => ({
      id: actionLabel,
      accessorFn: (row: ObjectStatisticParticipantRowDto) =>
        displayMode === 'value' ? (row.valueByActionLabel[actionLabel] ?? 0) : (row.pointsByActionLabel[actionLabel] ?? 0),
      header: ({ column }: { column: SortableColumn }) =>
        renderSortableColumnHeader(column, renderActionColumnHeaderContent(actionLabel, actionIconByLabel.value[actionLabel] ?? null)),
      cell: ({ row }: { row: { original: ObjectStatisticParticipantRowDto } }) => {
        const isTotalsRow = row.original.participantId === TOTALS_ROW_PARTICIPANT_ID

        if (displayMode === 'points') {
          const points = Math.round(row.original.pointsByActionLabel[actionLabel] ?? 0)
          if (!isTotalsRow && points === 0) return '–'
          return isTotalsRow ? renderBoldTabularNumber(points) : h('span', { class: 'text-sm tabular-nums' }, points.toLocaleString('de-DE'))
        }

        const value = row.original.valueByActionLabel[actionLabel] ?? 0
        if (isTotalsRow) return renderBoldTabularNumber(value)
        if (value === 0) return '–'
        return h('span', { class: 'text-sm tabular-nums' }, row.original.displayValueByActionLabel[actionLabel] ?? value.toLocaleString('de-DE'))
      }
    })),
    {
      id: 'total',
      accessorFn: (row: ObjectStatisticParticipantRowDto) => displayMode === 'value' ? row.totalValue : row.totalPoints,
      header: ({ column }: { column: SortableColumn }) => renderSortableColumnHeader(column, 'Gesamt'),
      cell: ({ row }) => renderBoldTabularNumber(displayMode === 'value' ? row.original.totalValue : Math.round(row.original.totalPoints))
    }
  ]
})

const tableInitialState = { sorting: [{ id: 'total', desc: true }] }

const participantRows = computed<ObjectStatisticParticipantRowDto[]>(() => {
  void statDisplayMode.value // force a fresh data reference on toggle so the table's sorted row model re-runs, not just the columns

  if (!detail.value) return []

  const valueByActionLabel: Record<string, number> = {}
  const pointsByActionLabel: Record<string, number> = {}
  for (const actionLabel of actionLabels.value) {
    valueByActionLabel[actionLabel] = detail.value.participants.reduce((sum, participant) => sum + (participant.valueByActionLabel[actionLabel] ?? 0), 0)
    pointsByActionLabel[actionLabel] = detail.value.participants.reduce((sum, participant) => sum + (participant.pointsByActionLabel[actionLabel] ?? 0), 0)
  }

  const totalsRow: ObjectStatisticParticipantRowDto = {
    participantId: TOTALS_ROW_PARTICIPANT_ID,
    displayName: 'Gesamt',
    minecraftUuid: '',
    valueByActionLabel,
    displayValueByActionLabel: {},
    totalValue: Object.values(valueByActionLabel).reduce((sum, value) => sum + value, 0),
    pointsByActionLabel,
    totalPoints: Object.values(pointsByActionLabel).reduce((sum, points) => sum + points, 0)
  }

  return [totalsRow, ...detail.value.participants]
})

const participantTableRowMeta = {
  class: {
    tr: (row: { original: ObjectStatisticParticipantRowDto }) =>
      row.original.participantId === TOTALS_ROW_PARTICIPANT_ID ? 'border-b-2 border-default' : ''
  }
}

function openParticipantDetail(_event: Event, row: { original: ObjectStatisticParticipantRowDto }) {
  if (row.original.participantId === TOTALS_ROW_PARTICIPANT_ID) return
  navigateTo(`/teilnehmer/${row.original.participantId}`)
}
</script>

<template>
  <UContainer
    v-if="detail"
    class="py-10 space-y-6"
  >
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <MinecraftObjectIcon
          :src="iconSrc"
          :alt="detail.objectLabel"
          :kind="kind === 'items' ? 'item' : 'entity'"
        />
        <h1 class="text-2xl font-semibold">
          {{ detail.objectLabel }}
        </h1>
      </div>
      <div class="flex flex-col items-end gap-1">
        <div class="flex items-center gap-3 text-sm">
          <button
            type="button"
            class="font-medium transition-colors"
            :class="statDisplayMode === 'value' ? 'text-primary' : 'text-muted hover:text-default'"
            @click="statDisplayMode = 'value'"
          >
            Wert
          </button>
          <button
            type="button"
            class="font-medium transition-colors"
            :class="statDisplayMode === 'points' ? 'text-primary' : 'text-muted hover:text-default'"
            @click="statDisplayMode = 'points'"
          >
            Punkte
          </button>
        </div>
        <DataFreshnessNote :as-of="dataAsOf" />
      </div>
    </div>

    <UTable
      :data="participantRows"
      :columns="tableColumns"
      :meta="participantTableRowMeta"
      :get-row-id="(row: ObjectStatisticParticipantRowDto) => row.participantId"
      :row-pinning="{ top: [TOTALS_ROW_PARTICIPANT_ID] }"
      :initial-state="tableInitialState"
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
