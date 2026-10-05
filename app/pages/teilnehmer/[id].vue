<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

interface PivotedParticipantActionCell {
  value: number
  displayValue: string
  points: number
}

interface GeneralStatisticThemeGroup {
  theme: string
  statistics: ParticipantStatisticRowDto[]
}

interface PivotedParticipantRow {
  objectKey: string
  objectLabel: string
  cellsByActionLabel: Record<string, PivotedParticipantActionCell | undefined>
  totalValue: number
  totalPoints: number
}

const route = useRoute()
const participantId = route.params.id as string

const { data: response, refresh } = await useFetch<DataWithFreshness<ParticipantDetailDto>>(`/api/participants/${participantId}`)

if (!response.value) {
  throw createError({ statusCode: 404, statusMessage: 'Teilnehmer nicht gefunden' })
}

useAutoRefresh(refresh, DATA_POLLING_INTERVAL_MILLISECONDS)

const participant = computed(() => response.value?.payload ?? null)
const dataAsOf = computed(() => response.value?.asOf ?? null)

const { data: iconBundle } = await useFetch<MinecraftIconBundleDto>('/api/icons/minecraft-bundle')

function findItemIconSrc(minecraftKey: string): string | null {
  return iconBundle.value?.itemIconsByBareId[stripMinecraftNamespace(minecraftKey)] ?? null
}

function findEntityIconSrc(minecraftKey: string): string | null {
  return iconBundle.value?.entityIconsByBareId[stripMinecraftNamespace(minecraftKey)] ?? null
}

const twitchChannelUrl = computed(() =>
  participant.value?.twitchLogin ? `https://twitch.tv/${participant.value.twitchLogin}` : null
)

type StatDisplayMode = 'value' | 'points'

const statDisplayMode = ref<StatDisplayMode>('value')

const statisticsSearchQuery = ref('')

const filteredStatistics = computed(() => {
  const allStatistics = participant.value?.statistics ?? []
  const searchQuery = statisticsSearchQuery.value.trim().toLowerCase()
  if (searchQuery.length === 0) return allStatistics

  return allStatistics.filter(statistic =>
    `${statistic.groupLabel} ${statistic.label}`.toLowerCase().includes(searchQuery)
  )
})

const generalStatistics = computed(() =>
  filteredStatistics.value.filter(statistic => statistic.group === 'allgemein')
)

const generalStatisticThemeGroups = computed<GeneralStatisticThemeGroup[]>(() => {
  const statisticsByTheme = new Map<string, ParticipantStatisticRowDto[]>()
  for (const statistic of generalStatistics.value) {
    const theme = statistic.groupLabel ?? 'Sonstiges'
    const themeStatistics = statisticsByTheme.get(theme) ?? []
    themeStatistics.push(statistic)
    statisticsByTheme.set(theme, themeStatistics)
  }

  for (const themeStatistics of statisticsByTheme.values()) {
    themeStatistics.sort((a, b) => statDisplayMode.value === 'value' ? b.value - a.value : b.points - a.points)
  }

  const orderedThemes = [
    ...GENERAL_STATISTIC_THEME_ORDER.filter(theme => statisticsByTheme.has(theme)),
    ...[...statisticsByTheme.keys()].filter(theme => !GENERAL_STATISTIC_THEME_ORDER.includes(theme)).sort()
  ]

  return orderedThemes.map(theme => ({ theme, statistics: statisticsByTheme.get(theme)! }))
})

const itemStatistics = computed(() =>
  filteredStatistics.value.filter(statistic => statistic.specificSubgroup === 'items')
)

const entityStatistics = computed(() =>
  filteredStatistics.value.filter(statistic => statistic.specificSubgroup === 'entities')
)

const statisticTabItems = [
  { label: 'Allgemein', value: 'allgemein', slot: 'allgemein' as const },
  { label: 'Items', value: 'items', slot: 'items' as const },
  { label: 'Entities', value: 'entities', slot: 'entities' as const }
]

const activeStatisticTab = ref('allgemein')

function openStatisticDetail(_event: Event, row: { original: ParticipantStatisticRowDto }) {
  navigateTo(`/statistiken/${row.original.slug}`)
}

const TOTALS_ROW_OBJECT_KEY = '__totals__'

function openItemDetail(_event: Event, row: { original: PivotedParticipantRow }) {
  if (row.original.objectKey === TOTALS_ROW_OBJECT_KEY) return
  navigateTo(`/statistiken/items/${stripMinecraftNamespace(row.original.objectKey)}`)
}

function openEntityDetail(_event: Event, row: { original: PivotedParticipantRow }) {
  if (row.original.objectKey === TOTALS_ROW_OBJECT_KEY) return
  navigateTo(`/statistiken/entities/${stripMinecraftNamespace(row.original.objectKey)}`)
}

const generalStatisticTableColumns = computed<TableColumn<ParticipantStatisticRowDto>[]>(() => [
  { accessorKey: 'label', header: 'Statistik', meta: { class: { th: 'w-1/2', td: 'w-1/2' } } },
  {
    id: 'value',
    header: statDisplayMode.value === 'value' ? 'Wert' : 'Punkte',
    meta: { class: { th: 'w-1/2', td: 'w-1/2' } },
    cell: ({ row }) => statDisplayMode.value === 'value' ? row.original.displayValue : Math.round(row.original.points)
  }
])

function buildPivotedParticipantRows(statisticsToPivot: ParticipantStatisticRowDto[]): PivotedParticipantRow[] {
  const rowsByObjectLabel = new Map<string, PivotedParticipantRow>()

  for (const statistic of statisticsToPivot) {
    if (statistic.groupLabel === null) continue

    const row = rowsByObjectLabel.get(statistic.label)
      ?? { objectKey: statistic.key, objectLabel: statistic.label, cellsByActionLabel: {}, totalValue: 0, totalPoints: 0 }
    row.cellsByActionLabel[statistic.groupLabel] = {
      value: statistic.value,
      displayValue: statistic.displayValue,
      points: statistic.points
    }
    rowsByObjectLabel.set(statistic.label, row)
  }

  for (const row of rowsByObjectLabel.values()) {
    row.totalValue = Object.values(row.cellsByActionLabel).reduce((sum, cell) => sum + (cell?.value ?? 0), 0)
    row.totalPoints = Object.values(row.cellsByActionLabel).reduce((sum, cell) => sum + (cell?.points ?? 0), 0)
  }

  return [...rowsByObjectLabel.values()]
}

function buildActionColumns(
  statisticsToPivot: ParticipantStatisticRowDto[],
  resolveHeaderIcon: (actionLabel: string) => string | null = () => null
): TableColumn<PivotedParticipantRow>[] {
  const displayMode = statDisplayMode.value
  const actionLabels = [...new Set(
    statisticsToPivot.map(statistic => statistic.groupLabel).filter((label): label is string => label !== null)
  )].sort()

  return actionLabels.map((actionLabel) => {
    const headerIcon = resolveHeaderIcon(actionLabel)
    const headerContent = renderActionColumnHeaderContent(actionLabel, headerIcon)

    return {
      id: actionLabel,
      accessorFn: (row: PivotedParticipantRow) => {
        const cell = row.cellsByActionLabel[actionLabel]
        if (!cell) return 0
        return displayMode === 'value' ? cell.value : cell.points
      },
      header: ({ column }: { column: SortableColumn }) => renderSortableColumnHeader(column, headerContent),
      cell: ({ row }: { row: { original: PivotedParticipantRow } }) => {
        const cell = row.original.cellsByActionLabel[actionLabel]
        if (!cell) return '–'
        const isTotalsRow = row.original.objectKey === TOTALS_ROW_OBJECT_KEY

        if (displayMode === 'points') {
          const points = Math.round(cell.points)
          if (!isTotalsRow && points === 0) return '–'
          return isTotalsRow ? renderBoldTabularNumber(points) : h('span', { class: 'text-sm tabular-nums' }, points.toLocaleString('de-DE'))
        }

        if (isTotalsRow) return renderBoldTabularNumber(cell.value)
        if (cell.value === 0) return '–'
        return h('span', { class: 'text-sm tabular-nums' }, cell.displayValue)
      }
    }
  })
}

function buildTotalColumn(): TableColumn<PivotedParticipantRow> {
  const displayMode = statDisplayMode.value

  return {
    id: 'total',
    accessorFn: (row: PivotedParticipantRow) => displayMode === 'value' ? row.totalValue : row.totalPoints,
    header: ({ column }: { column: SortableColumn }) => renderSortableColumnHeader(column, 'Gesamt'),
    cell: ({ row }) => renderBoldTabularNumber(displayMode === 'value' ? row.original.totalValue : Math.round(row.original.totalPoints))
  }
}

const pivotTableRowMeta = {
  class: {
    tr: (row: { original: PivotedParticipantRow }) =>
      row.original.objectKey === TOTALS_ROW_OBJECT_KEY ? 'border-b-2 border-default' : ''
  }
}

function buildTotalsRow(statisticsToPivot: ParticipantStatisticRowDto[]): PivotedParticipantRow {
  const valueSumByActionLabel: Record<string, number> = {}
  const pointsSumByActionLabel: Record<string, number> = {}
  for (const statistic of statisticsToPivot) {
    if (statistic.groupLabel === null) continue
    valueSumByActionLabel[statistic.groupLabel] = (valueSumByActionLabel[statistic.groupLabel] ?? 0) + statistic.value
    pointsSumByActionLabel[statistic.groupLabel] = (pointsSumByActionLabel[statistic.groupLabel] ?? 0) + statistic.points
  }

  return {
    objectKey: TOTALS_ROW_OBJECT_KEY,
    objectLabel: 'Gesamt',
    cellsByActionLabel: Object.fromEntries(
      Object.keys(valueSumByActionLabel).map((actionLabel) => {
        const value = valueSumByActionLabel[actionLabel]!
        const points = pointsSumByActionLabel[actionLabel]!
        return [actionLabel, { value, displayValue: value.toLocaleString('de-DE'), points }]
      })
    ),
    totalValue: Object.values(valueSumByActionLabel).reduce((sum, value) => sum + value, 0),
    totalPoints: Object.values(pointsSumByActionLabel).reduce((sum, points) => sum + points, 0)
  }
}

const pivotTableInitialState = { sorting: [{ id: 'total', desc: true }] }

const itemPivotRows = computed(() => {
  void statDisplayMode.value // force a fresh data reference on toggle so the table's sorted row model re-runs, not just the columns
  return [
    buildTotalsRow(itemStatistics.value),
    ...buildPivotedParticipantRows(itemStatistics.value)
  ]
})
const itemPivotColumns = computed<TableColumn<PivotedParticipantRow>[]>(() => [
  { accessorKey: 'objectLabel', header: 'Objekt', enableSorting: false },
  ...buildActionColumns(itemStatistics.value, actionLabel => ITEM_ACTION_ICON_BY_LABEL[actionLabel] ?? null),
  buildTotalColumn()
])

const entityPivotRows = computed(() => {
  void statDisplayMode.value // see itemPivotRows
  return [
    buildTotalsRow(entityStatistics.value),
    ...buildPivotedParticipantRows(entityStatistics.value)
  ]
})
const entityPivotColumns = computed<TableColumn<PivotedParticipantRow>[]>(() => [
  { accessorKey: 'objectLabel', header: 'Objekt', enableSorting: false },
  ...buildActionColumns(entityStatistics.value, actionLabel => ENTITY_ACTION_ICON_BY_LABEL[actionLabel] ?? null),
  buildTotalColumn()
])
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
        <div class="flex flex-col items-end gap-2">
          <DataFreshnessNote :as-of="dataAsOf" />
          <UInput
            v-model="statisticsSearchQuery"
            icon="i-lucide-search"
            placeholder="Statistik suchen…"
          />
        </div>
      </div>
    </div>

    <div class="relative">
      <UTabs
        v-model="activeStatisticTab"
        :items="statisticTabItems"
        variant="link"
        :ui="{ content: 'mt-6 min-w-0' }"
      >
        <template #allgemein>
          <div class="space-y-6">
            <div
              v-for="themeGroup in generalStatisticThemeGroups"
              :key="themeGroup.theme"
              class="space-y-3"
            >
              <h3 class="text-sm font-medium text-muted">
                {{ themeGroup.theme }}
              </h3>
              <UTable
                :data="themeGroup.statistics"
                :columns="generalStatisticTableColumns"
                @select="openStatisticDetail"
              />
            </div>
          </div>
        </template>

        <template #items>
          <UTable
            :data="itemPivotRows"
            :columns="itemPivotColumns"
            :meta="pivotTableRowMeta"
            :get-row-id="(row: PivotedParticipantRow) => row.objectKey"
            :row-pinning="{ top: [TOTALS_ROW_OBJECT_KEY] }"
            :initial-state="pivotTableInitialState"
            @select="openItemDetail"
          >
            <template #objectLabel-cell="{ row }">
              <span
                v-if="row.original.objectKey === TOTALS_ROW_OBJECT_KEY"
                class="text-sm font-medium"
              >Gesamt</span>
              <MinecraftObjectIcon
                v-else
                :src="findItemIconSrc(row.original.objectKey)"
                :alt="row.original.objectLabel"
                kind="item"
              />
            </template>
          </UTable>
        </template>

        <template #entities>
          <UTable
            :data="entityPivotRows"
            :columns="entityPivotColumns"
            :meta="pivotTableRowMeta"
            :get-row-id="(row: PivotedParticipantRow) => row.objectKey"
            :row-pinning="{ top: [TOTALS_ROW_OBJECT_KEY] }"
            :initial-state="pivotTableInitialState"
            @select="openEntityDetail"
          >
            <template #objectLabel-cell="{ row }">
              <span
                v-if="row.original.objectKey === TOTALS_ROW_OBJECT_KEY"
                class="text-sm font-medium"
              >Gesamt</span>
              <MinecraftObjectIcon
                v-else
                :src="findEntityIconSrc(row.original.objectKey)"
                :alt="row.original.objectLabel"
                kind="entity"
              />
            </template>
          </UTable>
        </template>
      </UTabs>

      <div class="absolute right-0 top-1 flex h-8 items-center gap-3 text-sm">
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
  </UContainer>
</template>
