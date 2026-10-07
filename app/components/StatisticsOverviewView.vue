<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

const props = defineProps<{
  activeTab: 'allgemein' | 'items' | 'entities' | 'advancements'
}>()

interface PivotedActionCell {
  maxValue: number
  maxDisplayValue: string
  totalValue: number
  totalDisplayValue: string
  leaders: StatisticLeaderDto[]
}

interface GeneralStatisticThemeGroup {
  theme: string
  statistics: StatisticListItemDto[]
}

interface PivotedStatisticRow {
  objectKey: string
  objectLabel: string
  cellsByActionLabel: Record<string, PivotedActionCell | undefined>
  maxValueAcrossActions: number
  totalValueAcrossActions: number
}

const statisticTabItems = [
  { label: 'Allgemein', value: 'allgemein', slot: 'allgemein' as const },
  { label: 'Items', value: 'items', slot: 'items' as const },
  { label: 'Entities', value: 'entities', slot: 'entities' as const },
  { label: 'Advancements', value: 'advancements', slot: 'advancements' as const }
]

const route = useRoute()

function currentQueryOverrides(): Record<string, string> {
  const query: Record<string, string> = {}
  if (pivotValueMode.value !== DEFAULT_PIVOT_VALUE_MODE) query.wert = 'summe'
  return query
}

const activeStatisticTab = computed({
  get: () => props.activeTab,
  set: (newTab: string) => navigateTo({ path: `/statistiken/${newTab}`, query: currentQueryOverrides() })
})

const { data: response, refresh } = await useFetch<DataWithFreshness<StatisticListItemDto[]>>('/api/statistics')
useAutoRefresh(refresh, DATA_POLLING_INTERVAL_MILLISECONDS)

const { data: advancementsResponse, refresh: refreshAdvancements } = await useFetch<DataWithFreshness<AdvancementListItemDto[]>>('/api/advancements')
useAutoRefresh(refreshAdvancements, DATA_POLLING_INTERVAL_MILLISECONDS)

const { data: iconBundle } = await useFetch<MinecraftIconBundleDto>('/api/icons/minecraft-bundle')

const statistics = computed(() => response.value?.payload ?? [])
const advancements = computed(() => advancementsResponse.value?.payload ?? [])
const dataAsOf = computed(() => response.value?.asOf ?? null)

type PivotValueMode = 'max' | 'total'

const DEFAULT_PIVOT_VALUE_MODE: PivotValueMode = 'max'

const pivotValueMode = ref<PivotValueMode>(route.query.wert === 'summe' ? 'total' : DEFAULT_PIVOT_VALUE_MODE)

const DEFAULT_PIVOT_SORTING = [{ id: 'valueAcrossActions', desc: true }]

function parsePivotSortingFromQuery(queryValue: unknown): { id: string, desc: boolean }[] {
  if (typeof queryValue !== 'string') return DEFAULT_PIVOT_SORTING

  const [id, direction] = queryValue.split('.')
  if (!id || (direction !== 'asc' && direction !== 'desc')) return DEFAULT_PIVOT_SORTING

  return [{ id, desc: direction === 'desc' }]
}

const pivotSorting = ref(parsePivotSortingFromQuery(route.query.sortierung))

watch(pivotSorting, (sorting) => {
  if (sorting.length === 0) pivotSorting.value = DEFAULT_PIVOT_SORTING // clicking a sorted column a third time clears it; fall back to the default instead of leaving the table unsorted
})

watch([pivotValueMode, pivotSorting], () => {
  const query = currentQueryOverrides()
  const sortEntry = pivotSorting.value[0]
  if (sortEntry && (sortEntry.id !== DEFAULT_PIVOT_SORTING[0]!.id || sortEntry.desc !== DEFAULT_PIVOT_SORTING[0]!.desc)) {
    query.sortierung = `${sortEntry.id}.${sortEntry.desc ? 'desc' : 'asc'}`
  }
  navigateTo({ path: route.path, query }, { replace: true })
}, { deep: true })

function findItemIconSrc(minecraftKey: string): string | null {
  return iconBundle.value?.itemIconsByBareId[stripMinecraftNamespace(minecraftKey)] ?? null
}

function findEntityIconSrc(minecraftKey: string): string | null {
  return iconBundle.value?.entityIconsByBareId[stripMinecraftNamespace(minecraftKey)] ?? null
}

function findAdvancementIconSrc(slug: string): string | null {
  return iconBundle.value?.advancementIconsBySlug[slug] ?? null
}

const statisticsSearchQuery = ref('')

const filteredStatistics = computed(() => {
  const searchQuery = statisticsSearchQuery.value.trim().toLowerCase()
  if (searchQuery.length === 0) return statistics.value

  return statistics.value.filter(statistic =>
    `${statistic.groupLabel} ${statistic.label}`.toLowerCase().includes(searchQuery)
  )
})

const selectedAdvancementCategory = ref<string | null>(null)

const advancementCategories = computed(() =>
  [...new Set(advancements.value.map(advancement => advancement.groupLabel))].sort()
)

const advancementCategoryFilterItems = computed(() => [
  { label: 'Alle', value: null },
  ...advancementCategories.value.map(category => ({ label: category, value: category }))
])

const filteredAdvancements = computed(() => {
  const searchQuery = statisticsSearchQuery.value.trim().toLowerCase()

  return advancements.value.filter((advancement) => {
    if (selectedAdvancementCategory.value !== null && advancement.groupLabel !== selectedAdvancementCategory.value) return false
    if (searchQuery.length === 0) return true
    return `${advancement.groupLabel} ${advancement.label}`.toLowerCase().includes(searchQuery)
  })
})

const generalStatistics = computed(() =>
  filteredStatistics.value.filter(statistic => statistic.group === 'allgemein')
)

const generalStatisticThemeGroups = computed<GeneralStatisticThemeGroup[]>(() => {
  const statisticsByTheme = new Map<string, StatisticListItemDto[]>()
  for (const statistic of generalStatistics.value) {
    const theme = statistic.groupLabel ?? 'Sonstiges'
    const themeStatistics = statisticsByTheme.get(theme) ?? []
    themeStatistics.push(statistic)
    statisticsByTheme.set(theme, themeStatistics)
  }

  for (const themeStatistics of statisticsByTheme.values()) {
    themeStatistics.sort((a, b) => pivotValueMode.value === 'max' ? b.maxValue - a.maxValue : b.totalValue - a.totalValue)
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

function openStatisticDetail(_event: Event, row: { original: StatisticListItemDto }) {
  navigateTo(`/statistiken/${row.original.slug}`)
}

function openAdvancementDetail(_event: Event, row: { original: AdvancementListItemDto }) {
  if (row.original.slug === TOTALS_ROW_OBJECT_KEY) return
  navigateTo(`/statistiken/advancements/${row.original.slug}`)
}

const advancementRows = computed<AdvancementListItemDto[]>(() => {
  const advancementsToShow = filteredAdvancements.value
  const totalParticipantCount = advancementsToShow.reduce((sum, advancement) => sum + advancement.participantCount, 0)
  const totalPoints = advancementsToShow.reduce((sum, advancement) => sum + advancement.points, 0)

  return [
    {
      slug: TOTALS_ROW_OBJECT_KEY,
      label: 'Gesamt',
      description: null,
      groupLabel: '',
      participantCount: totalParticipantCount,
      points: totalPoints,
      mostRecentCompletedAt: null,
      mostRecentCompletedAtDisplay: ''
    },
    ...advancementsToShow
  ]
})

const advancementTableColumns: TableColumn<AdvancementListItemDto>[] = [
  { accessorKey: 'label', header: 'Advancement', meta: { class: { th: 'h-14' } } },
  { accessorKey: 'groupLabel', header: 'Kategorie', meta: { class: { th: 'text-center', td: 'text-center' } } },
  { accessorKey: 'mostRecentCompletedAtDisplay', header: 'Zuletzt erreicht', meta: { class: { th: 'text-center', td: 'text-center' } } },
  {
    accessorKey: 'participantCount',
    header: 'Spieler',
    meta: { class: { th: 'text-right', td: 'text-right' } },
    cell: ({ row }) => row.original.slug === TOTALS_ROW_OBJECT_KEY
      ? renderBoldTabularNumber(row.original.participantCount)
      : row.original.participantCount
  },
  {
    accessorKey: 'points',
    header: 'Punkte',
    meta: { class: { th: 'text-right', td: 'text-right' } },
    cell: ({ row }) => row.original.slug === TOTALS_ROW_OBJECT_KEY
      ? renderBoldTabularNumber(Math.round(row.original.points))
      : Math.round(row.original.points)
  }
]

const advancementsTableRowMeta = {
  class: {
    tr: (row: { original: AdvancementListItemDto }) =>
      row.original.slug === TOTALS_ROW_OBJECT_KEY ? 'border-b-2 border-default' : ''
  }
}

function openItemDetail(_event: Event, row: { original: PivotedStatisticRow }) {
  if (row.original.objectKey === TOTALS_ROW_OBJECT_KEY) return
  navigateTo(`/statistiken/items/${stripMinecraftNamespace(row.original.objectKey)}`)
}

function openEntityDetail(_event: Event, row: { original: PivotedStatisticRow }) {
  if (row.original.objectKey === TOTALS_ROW_OBJECT_KEY) return
  navigateTo(`/statistiken/entities/${stripMinecraftNamespace(row.original.objectKey)}`)
}

function renderStatisticLeaderCell(slug: string | null, leaders: StatisticLeaderDto[], displayValue: string) {
  if (leaders.length === 0) return '–'

  const allLeaderNames = leaders.map(leader => leader.displayName).join(', ')
  const isClickable = slug !== null

  function handleClick(event: MouseEvent) {
    event.stopPropagation()
    navigateTo(`/statistiken/${slug}`)
  }

  return h(isClickable ? 'button' : 'span', {
    type: isClickable ? 'button' : undefined,
    class: `flex shrink-0 items-center gap-1.5${isClickable ? ' hover:opacity-80' : ''}`,
    title: allLeaderNames,
    onClick: isClickable ? handleClick : undefined
  }, [
    h('div', { class: 'flex shrink-0 flex-wrap gap-1 max-w-20' }, leaders.map(leader =>
      h('img', {
        key: leader.minecraftUuid,
        src: buildMinecraftAvatarRenderUrl(leader.minecraftUuid, 'avatar'),
        alt: leader.displayName,
        title: leader.displayName,
        class: 'size-6 rounded',
        loading: 'lazy',
        onError: (event: Event) => {
          (event.target as HTMLImageElement).style.display = 'none'
        }
      })
    )),
    h('span', { class: 'text-sm tabular-nums' }, displayValue)
  ])
}

const generalStatisticTableColumns = computed<TableColumn<StatisticListItemDto>[]>(() => [
  { accessorKey: 'label', header: 'Statistik', meta: { class: { th: 'w-1/2', td: 'w-1/2' } } },
  {
    id: 'leader',
    header: pivotValueMode.value === 'max' ? '1. Platz' : 'Summe',
    meta: { class: { th: 'w-1/2', td: 'w-1/2' } },
    cell: ({ row }) => pivotValueMode.value === 'max'
      ? renderStatisticLeaderCell(row.original.slug, row.original.leaders, row.original.maxDisplayValue)
      : h('span', { class: 'text-sm tabular-nums' }, row.original.totalDisplayValue)
  }
])

function buildPivotedStatisticRows(statisticsToPivot: StatisticListItemDto[]): PivotedStatisticRow[] {
  const rowsByObjectLabel = new Map<string, PivotedStatisticRow>()

  for (const statistic of statisticsToPivot) {
    if (statistic.groupLabel === null) continue

    const row = rowsByObjectLabel.get(statistic.label)
      ?? { objectKey: statistic.key, objectLabel: statistic.label, cellsByActionLabel: {}, maxValueAcrossActions: 0, totalValueAcrossActions: 0 }
    row.cellsByActionLabel[statistic.groupLabel] = {
      maxValue: statistic.maxValue,
      maxDisplayValue: statistic.maxDisplayValue,
      totalValue: statistic.totalValue,
      totalDisplayValue: statistic.totalDisplayValue,
      leaders: statistic.leaders
    }
    rowsByObjectLabel.set(statistic.label, row)
  }

  for (const row of rowsByObjectLabel.values()) {
    row.maxValueAcrossActions = Object.values(row.cellsByActionLabel)
      .reduce((sum, cell) => sum + (cell?.maxValue ?? 0), 0)
    row.totalValueAcrossActions = Object.values(row.cellsByActionLabel)
      .reduce((sum, cell) => sum + (cell?.totalValue ?? 0), 0)
  }

  return [...rowsByObjectLabel.values()]
}

function buildActionColumns(
  statisticsToPivot: StatisticListItemDto[],
  resolveHeaderIcon: (actionLabel: string) => string | null = () => null
): TableColumn<PivotedStatisticRow>[] {
  const valueMode = pivotValueMode.value
  const actionLabels = [...new Set(
    statisticsToPivot.map(statistic => statistic.groupLabel).filter((label): label is string => label !== null)
  )].sort()

  return actionLabels.map((actionLabel) => {
    const headerIcon = resolveHeaderIcon(actionLabel)
    const headerContent = renderActionColumnHeaderContent(actionLabel, headerIcon)

    return {
      id: actionLabel,
      accessorFn: (row: PivotedStatisticRow) => {
        const cell = row.cellsByActionLabel[actionLabel]
        if (!cell) return 0
        return valueMode === 'max' ? cell.maxValue : cell.totalValue
      },
      header: ({ column }: { column: SortableColumn }) => renderSortableColumnHeader(column, headerContent),
      cell: ({ row }: { row: { original: PivotedStatisticRow } }) => {
        const cell = row.original.cellsByActionLabel[actionLabel]
        if (!cell) return '–'
        if (valueMode === 'total') {
          return row.original.objectKey === TOTALS_ROW_OBJECT_KEY
            ? renderBoldTabularNumber(cell.totalValue)
            : h('span', { class: 'text-sm tabular-nums' }, cell.totalDisplayValue)
        }
        if (row.original.objectKey === TOTALS_ROW_OBJECT_KEY) return renderBoldTabularNumber(cell.maxValue)
        return renderStatisticLeaderCell(null, cell.leaders, cell.maxDisplayValue)
      }
    }
  })
}

function buildTotalValueAcrossActionsColumn(): TableColumn<PivotedStatisticRow> {
  const valueMode = pivotValueMode.value

  return {
    id: 'valueAcrossActions',
    accessorFn: (row: PivotedStatisticRow) => valueMode === 'max' ? row.maxValueAcrossActions : row.totalValueAcrossActions,
    header: ({ column }: { column: SortableColumn }) => renderSortableColumnHeader(column, 'Gesamt'),
    cell: ({ row }: { row: { original: PivotedStatisticRow } }) =>
      renderBoldTabularNumber(valueMode === 'max' ? row.original.maxValueAcrossActions : row.original.totalValueAcrossActions)
  }
}

const TOTALS_ROW_OBJECT_KEY = '__totals__'

const pivotTableRowMeta = {
  class: {
    tr: (row: { original: PivotedStatisticRow }) =>
      row.original.objectKey === TOTALS_ROW_OBJECT_KEY ? 'border-b-2 border-default' : ''
  }
}

function buildTotalsRow(statisticsToPivot: StatisticListItemDto[]): PivotedStatisticRow {
  const maxValueSumByActionLabel: Record<string, number> = {}
  const totalValueSumByActionLabel: Record<string, number> = {}
  for (const statistic of statisticsToPivot) {
    if (statistic.groupLabel === null) continue
    maxValueSumByActionLabel[statistic.groupLabel] = (maxValueSumByActionLabel[statistic.groupLabel] ?? 0) + statistic.maxValue
    totalValueSumByActionLabel[statistic.groupLabel] = (totalValueSumByActionLabel[statistic.groupLabel] ?? 0) + statistic.totalValue
  }

  return {
    objectKey: TOTALS_ROW_OBJECT_KEY,
    objectLabel: 'Gesamt',
    cellsByActionLabel: Object.fromEntries(
      Object.keys(maxValueSumByActionLabel).map((actionLabel) => {
        const maxValue = maxValueSumByActionLabel[actionLabel]!
        const totalValue = totalValueSumByActionLabel[actionLabel]!
        return [actionLabel, {
          maxValue,
          maxDisplayValue: maxValue.toLocaleString('de-DE'),
          totalValue,
          totalDisplayValue: totalValue.toLocaleString('de-DE'),
          leaders: []
        }]
      })
    ),
    maxValueAcrossActions: Object.values(maxValueSumByActionLabel).reduce((sum, value) => sum + value, 0),
    totalValueAcrossActions: Object.values(totalValueSumByActionLabel).reduce((sum, value) => sum + value, 0)
  }
}

const itemPivotRows = computed(() => {
  void pivotValueMode.value // read so this computed (and thus the table's sorted row model) re-runs on toggle, not just the columns
  return [
    buildTotalsRow(itemStatistics.value),
    ...buildPivotedStatisticRows(itemStatistics.value)
  ]
})
const itemPivotColumns = computed<TableColumn<PivotedStatisticRow>[]>(() => [
  { accessorKey: 'objectLabel', header: 'Objekt', enableSorting: false },
  ...buildActionColumns(itemStatistics.value, actionLabel => ITEM_ACTION_ICON_BY_LABEL[actionLabel] ?? null),
  buildTotalValueAcrossActionsColumn()
])

const entityPivotRows = computed(() => {
  void pivotValueMode.value // see itemPivotRows: forces this computed to re-run on toggle
  return [
    buildTotalsRow(entityStatistics.value),
    ...buildPivotedStatisticRows(entityStatistics.value)
  ]
})
const entityPivotColumns = computed<TableColumn<PivotedStatisticRow>[]>(() => [
  { accessorKey: 'objectLabel', header: 'Objekt', enableSorting: false },
  ...buildActionColumns(entityStatistics.value, actionLabel => ENTITY_ACTION_ICON_BY_LABEL[actionLabel] ?? null),
  buildTotalValueAcrossActionsColumn()
])
</script>

<template>
  <UContainer class="py-10 space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-2xl font-semibold">
        Statistiken
      </h1>
      <div class="flex items-center gap-3">
        <DataFreshnessNote :as-of="dataAsOf" />
        <UInput
          v-model="statisticsSearchQuery"
          icon="i-lucide-search"
          placeholder="Statistik suchen…"
        />
      </div>
    </div>

    <div class="relative">
      <UTabs
        v-model="activeStatisticTab"
        :items="statisticTabItems"
        variant="link"
        :ui="{ root: 'gap-0', content: 'min-w-0' }"
      >
        <template #allgemein>
          <div class="mt-6 space-y-6">
            <div
              v-for="themeGroup in generalStatisticThemeGroups"
              :key="themeGroup.theme"
              class="space-y-2"
            >
              <h3 class="pl-2 text-sm font-semibold text-default">
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
            v-model:sorting="pivotSorting"
            :data="itemPivotRows"
            :columns="itemPivotColumns"
            :meta="pivotTableRowMeta"
            :get-row-id="(row: PivotedStatisticRow) => row.objectKey"
            :row-pinning="{ top: [TOTALS_ROW_OBJECT_KEY] }"
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
            v-model:sorting="pivotSorting"
            :data="entityPivotRows"
            :columns="entityPivotColumns"
            :meta="pivotTableRowMeta"
            :get-row-id="(row: PivotedStatisticRow) => row.objectKey"
            :row-pinning="{ top: [TOTALS_ROW_OBJECT_KEY] }"
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

        <template #advancements>
          <UTable
            :data="advancementRows"
            :columns="advancementTableColumns"
            :meta="advancementsTableRowMeta"
            :get-row-id="(row: AdvancementListItemDto) => row.slug"
            :row-pinning="{ top: [TOTALS_ROW_OBJECT_KEY] }"
            @select="openAdvancementDetail"
          >
            <template #label-cell="{ row }">
              <span
                v-if="row.original.slug === TOTALS_ROW_OBJECT_KEY"
                class="text-sm font-medium"
              >Gesamt</span>
              <div
                v-else
                class="flex items-center gap-2"
              >
                <MinecraftObjectIcon
                  :src="findAdvancementIconSrc(row.original.slug)"
                  :alt="row.original.label"
                  kind="item"
                />
                <div>
                  <div>{{ row.original.label }}</div>
                  <div
                    v-if="row.original.description"
                    class="text-xs text-muted"
                  >
                    {{ row.original.description }}
                  </div>
                </div>
              </div>
            </template>
          </UTable>
        </template>
      </UTabs>

      <div
        v-if="activeTab !== 'advancements'"
        class="absolute right-0 top-1 flex h-8 items-center gap-3 text-sm"
      >
        <button
          type="button"
          class="font-medium transition-colors"
          :class="pivotValueMode === 'max' ? 'text-primary' : 'text-muted hover:text-default'"
          @click="pivotValueMode = 'max'"
        >
          Bestwert
        </button>
        <button
          type="button"
          class="font-medium transition-colors"
          :class="pivotValueMode === 'total' ? 'text-primary' : 'text-muted hover:text-default'"
          @click="pivotValueMode = 'total'"
        >
          Summe
        </button>
      </div>

      <div
        v-if="activeTab === 'advancements'"
        class="absolute right-0 top-1 flex h-8 items-center"
      >
        <USelect
          v-model="selectedAdvancementCategory"
          :items="advancementCategoryFilterItems"
          size="sm"
          class="w-36"
        />
      </div>
    </div>
  </UContainer>
</template>
