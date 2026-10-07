<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

const props = defineProps<{
  kind: SpecificStatisticSubgroup
  bareKey: string
}>()

interface ResolvedObjectStatisticParticipantRow {
  participantId: string
  displayName: string
  minecraftUuid: string
  valueByCategory: Record<string, number>
  displayValueByCategory: Record<string, string>
  totalValue: number
  pointsByCategory: Record<string, number>
  totalPoints: number
}

interface ResolvedObjectStatisticDetail {
  objectKey: string
  objectLabel: string
  categories: string[]
  labelByCategory: Record<string, string>
  participants: ResolvedObjectStatisticParticipantRow[]
}

const { data: response, refresh } = await useFetch<DataWithFreshness<ObjectStatisticDetailDto>>(
  () => `/api/statistics/${props.kind}/${props.bareKey}`
)

if (!response.value) {
  throw createError({ statusCode: 404, statusMessage: props.kind === 'items' ? 'Item nicht gefunden' : 'Entity nicht gefunden' })
}

useAutoRefresh(refresh, DATA_POLLING_INTERVAL_MILLISECONDS)

// the object name (item/entity identity) follows "Items & Entities"; the per-category column headers follow "Statistiken"
const { resolvedObjectsLocale, resolvedStatisticsLocale } = useMinecraftNameLocale()

// single place where the raw bilingual API payload is resolved into plain display strings for the currently selected locale - everything below this point works with plain strings only
const detail = computed<ResolvedObjectStatisticDetail | null>(() => {
  const rawDetail = response.value?.payload
  if (!rawDetail) return null

  return {
    objectKey: rawDetail.objectKey,
    objectLabel: resolveLocalizedLabel(rawDetail.objectLabel, resolvedObjectsLocale.value),
    categories: rawDetail.categories,
    labelByCategory: Object.fromEntries(
      rawDetail.categories.map(category => [category, resolveLocalizedLabel(rawDetail.groupLabelByCategory[category]!, resolvedStatisticsLocale.value)])
    ),
    participants: rawDetail.participants
  }
})

const dataAsOf = computed(() => response.value?.asOf ?? null)

const { data: iconBundle } = await useFetch<MinecraftIconBundleDto>('/api/icons/minecraft-bundle')

const iconSrc = computed(() => props.kind === 'items'
  ? iconBundle.value?.itemIconsByBareId[props.bareKey] ?? null
  : iconBundle.value?.entityIconsByBareId[props.bareKey] ?? null)

const actionIconByCategory = computed(() => props.kind === 'items' ? ITEM_ACTION_ICON_BY_CATEGORY : ENTITY_ACTION_ICON_BY_CATEGORY)

function resolveActionIcon(category: string): string | null {
  return actionIconByCategory.value[stripMinecraftNamespace(category)] ?? null
}

const TOTALS_ROW_PARTICIPANT_ID = '__totals__'

type StatDisplayMode = 'value' | 'points'

const statDisplayMode = ref<StatDisplayMode>('value')

const tableColumns = computed<TableColumn<ResolvedObjectStatisticParticipantRow>[]>(() => {
  const displayMode = statDisplayMode.value
  const labelByCategory = detail.value?.labelByCategory ?? {}
  const participants = detail.value?.participants ?? []
  // matches whatever the Gesamt row shows for the active mode, so the column order lines up with it
  const categories = sortKeysByTotalDescending(
    detail.value?.categories ?? [],
    category => participants.reduce((sum, participant) =>
      sum + (displayMode === 'value' ? (participant.valueByCategory[category] ?? 0) : (participant.pointsByCategory[category] ?? 0)), 0)
  )

  return [
    { accessorKey: 'displayName', header: 'Spieler', enableSorting: false },
    ...categories.map((category): TableColumn<ResolvedObjectStatisticParticipantRow> => ({
      id: category,
      accessorFn: (row: ResolvedObjectStatisticParticipantRow) =>
        displayMode === 'value' ? (row.valueByCategory[category] ?? 0) : (row.pointsByCategory[category] ?? 0),
      header: ({ column }: { column: SortableColumn }) =>
        renderSortableColumnHeader(column, renderActionColumnHeaderContent(labelByCategory[category]!, resolveActionIcon(category))),
      cell: ({ row }: { row: { original: ResolvedObjectStatisticParticipantRow } }) => {
        const isTotalsRow = row.original.participantId === TOTALS_ROW_PARTICIPANT_ID

        if (displayMode === 'points') {
          const points = Math.round(row.original.pointsByCategory[category] ?? 0)
          if (!isTotalsRow && points === 0) return '–'
          return isTotalsRow ? renderBoldTabularNumber(points) : h('span', { class: 'text-sm tabular-nums' }, points.toLocaleString('de-DE'))
        }

        const value = row.original.valueByCategory[category] ?? 0
        if (isTotalsRow) return renderBoldTabularNumber(value)
        if (value === 0) return '–'
        return h('span', { class: 'text-sm tabular-nums' }, row.original.displayValueByCategory[category] ?? value.toLocaleString('de-DE'))
      }
    })),
    {
      id: 'total',
      accessorFn: (row: ResolvedObjectStatisticParticipantRow) => displayMode === 'value' ? row.totalValue : row.totalPoints,
      header: ({ column }: { column: SortableColumn }) => renderSortableColumnHeader(column, 'Gesamt'),
      cell: ({ row }) => renderBoldTabularNumber(displayMode === 'value' ? row.original.totalValue : Math.round(row.original.totalPoints))
    }
  ]
})

const tableInitialState = { sorting: [{ id: 'total', desc: true }] }

const participantRows = computed<ResolvedObjectStatisticParticipantRow[]>(() => {
  void statDisplayMode.value // force a fresh data reference on toggle so the table's sorted row model re-runs, not just the columns

  if (!detail.value) return []

  const valueByCategory: Record<string, number> = {}
  const pointsByCategory: Record<string, number> = {}
  for (const category of detail.value.categories) {
    valueByCategory[category] = detail.value.participants.reduce((sum, participant) => sum + (participant.valueByCategory[category] ?? 0), 0)
    pointsByCategory[category] = detail.value.participants.reduce((sum, participant) => sum + (participant.pointsByCategory[category] ?? 0), 0)
  }

  const totalsRow: ResolvedObjectStatisticParticipantRow = {
    participantId: TOTALS_ROW_PARTICIPANT_ID,
    displayName: 'Gesamt',
    minecraftUuid: '',
    valueByCategory,
    displayValueByCategory: {},
    totalValue: Object.values(valueByCategory).reduce((sum, value) => sum + value, 0),
    pointsByCategory,
    totalPoints: Object.values(pointsByCategory).reduce((sum, points) => sum + points, 0)
  }

  return [totalsRow, ...detail.value.participants]
})

const participantTableRowMeta = {
  class: {
    tr: (row: { original: ResolvedObjectStatisticParticipantRow }) =>
      row.original.participantId === TOTALS_ROW_PARTICIPANT_ID ? 'border-b-2 border-default' : ''
  }
}

function openParticipantDetail(_event: Event, row: { original: ResolvedObjectStatisticParticipantRow }) {
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
        <DataFreshnessNote :as-of="dataAsOf" />
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
      </div>
    </div>

    <UTable
      :data="participantRows"
      :columns="tableColumns"
      :meta="participantTableRowMeta"
      :get-row-id="(row: ResolvedObjectStatisticParticipantRow) => row.participantId"
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
