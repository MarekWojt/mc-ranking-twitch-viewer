<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

interface PivotedActionCell {
  slug: string
  maxValue: number
  maxDisplayValue: string
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
  totalValueAcrossActions: number
}

const { data: response, refresh } = await useFetch<DataWithFreshness<StatisticListItemDto[]>>('/api/statistics')
useAutoRefresh(refresh, DATA_POLLING_INTERVAL_MILLISECONDS)

const { data: iconBundle } = await useFetch<MinecraftIconBundleDto>('/api/icons/minecraft-bundle')

const statistics = computed(() => response.value?.payload ?? [])
const dataAsOf = computed(() => response.value?.asOf ?? null)

function stripMinecraftNamespace(minecraftId: string): string {
  const namespaceSeparatorIndex = minecraftId.indexOf(':')
  return namespaceSeparatorIndex === -1 ? minecraftId : minecraftId.slice(namespaceSeparatorIndex + 1)
}

function findItemIconSrc(minecraftKey: string): string | null {
  return iconBundle.value?.itemIconsByBareId[stripMinecraftNamespace(minecraftKey)] ?? null
}

function findEntityIconSrc(minecraftKey: string): string | null {
  return iconBundle.value?.entityIconsByBareId[stripMinecraftNamespace(minecraftKey)] ?? null
}

const statisticsSearchQuery = ref('')

const filteredStatistics = computed(() => {
  const searchQuery = statisticsSearchQuery.value.trim().toLowerCase()
  if (searchQuery.length === 0) return statistics.value

  return statistics.value.filter(statistic =>
    `${statistic.groupLabel} ${statistic.label}`.toLowerCase().includes(searchQuery)
  )
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
    themeStatistics.sort((a, b) => b.maxValue - a.maxValue)
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

function openStatisticDetail(_event: Event, row: { original: StatisticListItemDto }) {
  navigateTo(`/statistiken/${row.original.slug}`)
}

function renderStatisticLeaderCell(slug: string, leaders: StatisticLeaderDto[], displayValue: string) {
  if (leaders.length === 0) return '–'

  const allLeaderNames = leaders.map(leader => leader.displayName).join(', ')

  return h('button', {
    type: 'button',
    class: 'flex items-center gap-1.5 hover:opacity-80',
    title: allLeaderNames,
    onClick: (event: MouseEvent) => {
      event.stopPropagation()
      navigateTo(`/statistiken/${slug}`)
    }
  }, [
    h('div', { class: 'flex flex-wrap gap-1 max-w-20' }, leaders.map(leader =>
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

const generalStatisticTableColumns: TableColumn<StatisticListItemDto>[] = [
  { accessorKey: 'label', header: 'Statistik', meta: { class: { th: 'w-1/2', td: 'w-1/2' } } },
  {
    id: 'leader',
    header: '1. Platz',
    meta: { class: { th: 'w-1/2', td: 'w-1/2' } },
    cell: ({ row }) => renderStatisticLeaderCell(row.original.slug, row.original.leaders, row.original.maxDisplayValue)
  }
]

function buildPivotedStatisticRows(statisticsToPivot: StatisticListItemDto[]): PivotedStatisticRow[] {
  const rowsByObjectLabel = new Map<string, PivotedStatisticRow>()

  for (const statistic of statisticsToPivot) {
    if (statistic.groupLabel === null) continue

    const row = rowsByObjectLabel.get(statistic.label)
      ?? { objectKey: statistic.key, objectLabel: statistic.label, cellsByActionLabel: {}, totalValueAcrossActions: 0 }
    row.cellsByActionLabel[statistic.groupLabel] = {
      slug: statistic.slug,
      maxValue: statistic.maxValue,
      maxDisplayValue: statistic.maxDisplayValue,
      leaders: statistic.leaders
    }
    rowsByObjectLabel.set(statistic.label, row)
  }

  for (const row of rowsByObjectLabel.values()) {
    row.totalValueAcrossActions = Object.values(row.cellsByActionLabel)
      .reduce((sum, cell) => sum + (cell?.maxValue ?? 0), 0)
  }

  return [...rowsByObjectLabel.values()]
}

function sortRowsByTotalValueAcrossActionsDescending(rows: PivotedStatisticRow[]): PivotedStatisticRow[] {
  return [...rows].sort((a, b) => b.totalValueAcrossActions - a.totalValueAcrossActions)
}

const ITEM_ACTION_ICON_BY_LABEL: Record<string, string> = {
  'Broken': '💥',
  'Crafted': '🛠️',
  'Dropped': '🔻',
  'Mined': '⛏️',
  'Picked Up': '🔺',
  'Used': '✋'
}

const ENTITY_ACTION_ICON_BY_LABEL: Record<string, string> = {
  'Killed': '🔪',
  'Killed By': '☠️'
}

function buildActionColumns(
  statisticsToPivot: StatisticListItemDto[],
  resolveHeaderIcon: (actionLabel: string) => string | null = () => null
): TableColumn<PivotedStatisticRow>[] {
  const actionLabels = [...new Set(
    statisticsToPivot.map(statistic => statistic.groupLabel).filter((label): label is string => label !== null)
  )].sort()

  return actionLabels.map((actionLabel) => {
    const headerIcon = resolveHeaderIcon(actionLabel)

    return {
      id: actionLabel,
      header: () => h('span', { title: actionLabel, class: 'inline-flex items-center gap-1' }, headerIcon
        ? [h('span', { class: 'text-lg' }, headerIcon), h('span', {}, actionLabel)]
        : actionLabel),
      cell: ({ row }: { row: { original: PivotedStatisticRow } }) => {
        const cell = row.original.cellsByActionLabel[actionLabel]
        if (!cell) return '–'
        return renderStatisticLeaderCell(cell.slug, cell.leaders, cell.maxDisplayValue)
      }
    }
  })
}

const totalValueAcrossActionsColumn: TableColumn<PivotedStatisticRow> = {
  id: 'totalValueAcrossActions',
  header: 'Gesamt',
  cell: ({ row }) => h('span', { class: 'text-sm tabular-nums font-medium' }, row.original.totalValueAcrossActions.toLocaleString('de-DE'))
}

const itemPivotRows = computed(() =>
  sortRowsByTotalValueAcrossActionsDescending(buildPivotedStatisticRows(itemStatistics.value))
)
const itemPivotColumns = computed<TableColumn<PivotedStatisticRow>[]>(() => [
  { accessorKey: 'objectLabel', header: 'Objekt' },
  ...buildActionColumns(itemStatistics.value, actionLabel => ITEM_ACTION_ICON_BY_LABEL[actionLabel] ?? null),
  totalValueAcrossActionsColumn
])

const entityPivotRows = computed(() =>
  sortRowsByTotalValueAcrossActionsDescending(buildPivotedStatisticRows(entityStatistics.value))
)
const entityPivotColumns = computed<TableColumn<PivotedStatisticRow>[]>(() => [
  { accessorKey: 'objectLabel', header: 'Objekt' },
  ...buildActionColumns(entityStatistics.value, actionLabel => ENTITY_ACTION_ICON_BY_LABEL[actionLabel] ?? null),
  totalValueAcrossActionsColumn
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

    <UTabs
      :items="statisticTabItems"
      default-value="allgemein"
      variant="link"
      :ui="{ content: 'mt-6' }"
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
        >
          <template #objectLabel-cell="{ row }">
            <MinecraftObjectIcon
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
        >
          <template #objectLabel-cell="{ row }">
            <MinecraftObjectIcon
              :src="findEntityIconSrc(row.original.objectKey)"
              :alt="row.original.objectLabel"
              kind="entity"
            />
          </template>
        </UTable>
      </template>
    </UTabs>
  </UContainer>
</template>
