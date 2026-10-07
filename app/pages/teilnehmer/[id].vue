<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

interface ResolvedStatistic {
  slug: string
  key: string
  category: string
  label: string
  group: StatisticGroup
  groupLabel: string | null
  specificSubgroup: SpecificStatisticSubgroup | null
  value: number
  displayValue: string
  points: number
  searchText: string
}

interface ResolvedAdvancement {
  slug: string
  category: string
  label: string
  description: string | null
  groupLabel: string
  points: number
  completedAt: string | null
  completedAtDisplay: string
  searchText: string
}

interface PivotedParticipantActionCell {
  value: number
  displayValue: string
  points: number
}

interface GeneralStatisticThemeGroup {
  theme: string
  statistics: ResolvedStatistic[]
}

interface PivotedParticipantRow {
  objectKey: string
  objectLabel: string
  cellsByActionCategory: Record<string, PivotedParticipantActionCell | undefined>
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

const { resolvedObjectsLocale, resolvedStatisticsLocale, resolvedAdvancementsLocale } = useMinecraftNameLocale()

// single place where the raw bilingual API payload is resolved into plain display strings for the currently selected locale per type - everything below this point works with plain strings only
const statistics = computed<ResolvedStatistic[]>(() => {
  const rawStatistics = participant.value?.statistics ?? []

  return rawStatistics.map(statistic => ({
    ...statistic,
    ...resolveStatisticLabelAndGroupLabel(statistic, resolvedObjectsLocale.value, resolvedStatisticsLocale.value)
  }))
})

const advancements = computed<ResolvedAdvancement[]>(() => {
  const rawAdvancements = participant.value?.advancements ?? []
  const locale = resolvedAdvancementsLocale.value

  return rawAdvancements.map(advancement => ({
    ...advancement,
    ...resolveAdvancementFields(advancement, locale)
  }))
})

function findItemIconSrc(minecraftKey: string): string | null {
  return iconBundle.value?.itemIconsByBareId[stripMinecraftNamespace(minecraftKey)] ?? null
}

function findEntityIconSrc(minecraftKey: string): string | null {
  return iconBundle.value?.entityIconsByBareId[stripMinecraftNamespace(minecraftKey)] ?? null
}

function findAdvancementIconSrc(slug: string): string | null {
  return iconBundle.value?.advancementIconsBySlug[slug] ?? null
}

const twitchChannelUrl = computed(() =>
  participant.value?.twitchLogin ? `https://twitch.tv/${participant.value.twitchLogin}` : null
)

type StatDisplayMode = 'value' | 'points'

const statDisplayMode = ref<StatDisplayMode>('value')

const statisticsSearchQuery = ref('')

const filteredStatistics = computed(() => {
  const searchQuery = statisticsSearchQuery.value.trim().toLowerCase()
  if (searchQuery.length === 0) return statistics.value

  return statistics.value.filter(statistic => statistic.searchText.includes(searchQuery))
})

const generalStatistics = computed(() =>
  filteredStatistics.value.filter(statistic => statistic.group === 'allgemein')
)

const selectedAdvancementCategory = ref<string | null>(null)

const advancementCategoryOptions = computed(() => {
  const labelByCategory = new Map<string, string>()
  for (const advancement of advancements.value) {
    labelByCategory.set(advancement.category, advancement.groupLabel)
  }
  return [...labelByCategory.entries()].sort((a, b) => a[1].localeCompare(b[1]))
})

const advancementCategoryFilterItems = computed(() => [
  { label: 'Alle', value: null },
  ...advancementCategoryOptions.value.map(([category, label]) => ({ label, value: category }))
])

const filteredAdvancements = computed(() => {
  const searchQuery = statisticsSearchQuery.value.trim().toLowerCase()

  return advancements.value.filter((advancement) => {
    if (selectedAdvancementCategory.value !== null && advancement.category !== selectedAdvancementCategory.value) return false
    if (searchQuery.length === 0) return true
    return advancement.searchText.includes(searchQuery)
  })
})

const generalStatisticThemeGroups = computed<GeneralStatisticThemeGroup[]>(() => {
  const statisticsByTheme = new Map<string, ResolvedStatistic[]>()
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
  { label: 'Entities', value: 'entities', slot: 'entities' as const },
  { label: 'Advancements', value: 'advancements', slot: 'advancements' as const }
]

const activeStatisticTab = ref('allgemein')

function openStatisticDetail(_event: Event, row: { original: ResolvedStatistic }) {
  navigateTo(`/statistiken/${row.original.slug}`)
}

const TOTALS_ROW_OBJECT_KEY = '__totals__'

function openAdvancementDetail(_event: Event, row: { original: ResolvedAdvancement }) {
  if (row.original.slug === TOTALS_ROW_OBJECT_KEY) return
  navigateTo(`/statistiken/advancements/${row.original.slug}`)
}

const advancementRows = computed<ResolvedAdvancement[]>(() => {
  const advancementsToShow = filteredAdvancements.value
  const totalPoints = advancementsToShow.reduce((sum, advancement) => sum + advancement.points, 0)

  return [
    {
      slug: TOTALS_ROW_OBJECT_KEY,
      category: '',
      label: 'Gesamt',
      description: null,
      groupLabel: '',
      points: totalPoints,
      completedAt: null,
      completedAtDisplay: '',
      searchText: ''
    },
    ...advancementsToShow
  ]
})

const advancementTableColumns: TableColumn<ResolvedAdvancement>[] = [
  { accessorKey: 'label', header: 'Advancement', meta: { class: { th: 'h-14' } } },
  { accessorKey: 'groupLabel', header: 'Kategorie', meta: { class: { th: 'text-center', td: 'text-center' } } },
  { accessorKey: 'completedAtDisplay', header: 'Erreicht am', meta: { class: { th: 'text-center', td: 'text-center' } } },
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
    tr: (row: { original: ResolvedAdvancement }) =>
      row.original.slug === TOTALS_ROW_OBJECT_KEY ? 'border-b-2 border-default' : ''
  }
}

function openItemDetail(_event: Event, row: { original: PivotedParticipantRow }) {
  if (row.original.objectKey === TOTALS_ROW_OBJECT_KEY) return
  navigateTo(`/statistiken/items/${stripMinecraftNamespace(row.original.objectKey)}`)
}

function openEntityDetail(_event: Event, row: { original: PivotedParticipantRow }) {
  if (row.original.objectKey === TOTALS_ROW_OBJECT_KEY) return
  navigateTo(`/statistiken/entities/${stripMinecraftNamespace(row.original.objectKey)}`)
}

const generalStatisticTableColumns = computed<TableColumn<ResolvedStatistic>[]>(() => [
  { accessorKey: 'label', header: 'Statistik', meta: { class: { th: 'w-1/2', td: 'w-1/2' } } },
  {
    id: 'value',
    header: statDisplayMode.value === 'value' ? 'Wert' : 'Punkte',
    meta: { class: { th: 'w-1/2', td: 'w-1/2' } },
    cell: ({ row }) => statDisplayMode.value === 'value' ? row.original.displayValue : Math.round(row.original.points)
  }
])

function buildPivotedParticipantRows(statisticsToPivot: ResolvedStatistic[]): PivotedParticipantRow[] {
  const rowsByObjectKey = new Map<string, PivotedParticipantRow>()

  for (const statistic of statisticsToPivot) {
    if (statistic.groupLabel === null) continue

    const row = rowsByObjectKey.get(statistic.key)
      ?? { objectKey: statistic.key, objectLabel: statistic.label, cellsByActionCategory: {}, totalValue: 0, totalPoints: 0 }
    row.cellsByActionCategory[statistic.category] = {
      value: statistic.value,
      displayValue: statistic.displayValue,
      points: statistic.points
    }
    rowsByObjectKey.set(statistic.key, row)
  }

  for (const row of rowsByObjectKey.values()) {
    row.totalValue = Object.values(row.cellsByActionCategory).reduce((sum, cell) => sum + (cell?.value ?? 0), 0)
    row.totalPoints = Object.values(row.cellsByActionCategory).reduce((sum, cell) => sum + (cell?.points ?? 0), 0)
  }

  return [...rowsByObjectKey.values()]
}

function buildActionColumns(
  statisticsToPivot: ResolvedStatistic[],
  resolveHeaderIcon: (category: string) => string | null = () => null
): TableColumn<PivotedParticipantRow>[] {
  const displayMode = statDisplayMode.value
  const labelByCategory = new Map<string, string>()
  const totalValueByCategory = new Map<string, number>()
  for (const statistic of statisticsToPivot) {
    if (statistic.groupLabel === null) continue
    labelByCategory.set(statistic.category, statistic.groupLabel)
    // matches whatever buildTotalsRow shows in the Gesamt row for the active mode, so the column order lines up with it
    const categoryValue = displayMode === 'value' ? statistic.value : statistic.points
    totalValueByCategory.set(statistic.category, (totalValueByCategory.get(statistic.category) ?? 0) + categoryValue)
  }
  const categories = sortKeysByTotalDescending(labelByCategory.keys(), category => totalValueByCategory.get(category) ?? 0)

  return categories.map((category) => {
    const actionLabel = labelByCategory.get(category)!
    const headerIcon = resolveHeaderIcon(category)
    const headerContent = renderActionColumnHeaderContent(actionLabel, headerIcon)

    return {
      id: category,
      accessorFn: (row: PivotedParticipantRow) => {
        const cell = row.cellsByActionCategory[category]
        if (!cell) return 0
        return displayMode === 'value' ? cell.value : cell.points
      },
      header: ({ column }: { column: SortableColumn }) => renderSortableColumnHeader(column, headerContent),
      cell: ({ row }: { row: { original: PivotedParticipantRow } }) => {
        const cell = row.original.cellsByActionCategory[category]
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

function buildTotalsRow(statisticsToPivot: ResolvedStatistic[]): PivotedParticipantRow {
  const valueSumByCategory: Record<string, number> = {}
  const pointsSumByCategory: Record<string, number> = {}
  for (const statistic of statisticsToPivot) {
    if (statistic.groupLabel === null) continue
    valueSumByCategory[statistic.category] = (valueSumByCategory[statistic.category] ?? 0) + statistic.value
    pointsSumByCategory[statistic.category] = (pointsSumByCategory[statistic.category] ?? 0) + statistic.points
  }

  return {
    objectKey: TOTALS_ROW_OBJECT_KEY,
    objectLabel: 'Gesamt',
    cellsByActionCategory: Object.fromEntries(
      Object.keys(valueSumByCategory).map((category) => {
        const value = valueSumByCategory[category]!
        const points = pointsSumByCategory[category]!
        return [category, { value, displayValue: value.toLocaleString('de-DE'), points }]
      })
    ),
    totalValue: Object.values(valueSumByCategory).reduce((sum, value) => sum + value, 0),
    totalPoints: Object.values(pointsSumByCategory).reduce((sum, points) => sum + points, 0)
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
  ...buildActionColumns(itemStatistics.value, category => ITEM_ACTION_ICON_BY_CATEGORY[stripMinecraftNamespace(category)] ?? null),
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
  ...buildActionColumns(entityStatistics.value, category => ENTITY_ACTION_ICON_BY_CATEGORY[stripMinecraftNamespace(category)] ?? null),
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

        <template #advancements>
          <UTable
            :data="advancementRows"
            :columns="advancementTableColumns"
            :meta="advancementsTableRowMeta"
            :get-row-id="(row: ResolvedAdvancement) => row.slug"
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
        v-if="activeStatisticTab !== 'advancements'"
        class="absolute right-0 top-1 flex h-8 items-center gap-3 text-sm"
      >
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

      <div
        v-if="activeStatisticTab === 'advancements'"
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
