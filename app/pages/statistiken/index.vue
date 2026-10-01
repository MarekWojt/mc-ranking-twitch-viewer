<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

interface PivotedActionCell {
  slug: string
  maxValue: number
  leaders: StatisticLeaderDto[]
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

const itemStatistics = computed(() =>
  filteredStatistics.value.filter(statistic => statistic.specificSubgroup === 'items')
)

const entityStatistics = computed(() =>
  filteredStatistics.value.filter(statistic => statistic.specificSubgroup === 'entities')
)

const generalStatisticTableColumns: TableColumn<StatisticListItemDto>[] = [
  { accessorKey: 'label', header: 'Statistik' },
  { id: 'leader', header: '1. Platz' }
]

const itemsAndEntitiesTabItems = [
  { label: 'Items', value: 'items', slot: 'items' as const },
  { label: 'Entities', value: 'entities', slot: 'entities' as const }
]

function openStatisticDetail(_event: Event, row: { original: StatisticListItemDto }) {
  navigateTo(`/statistiken/${row.original.slug}`)
}

function buildPivotedStatisticRows(statisticsToPivot: StatisticListItemDto[]): PivotedStatisticRow[] {
  const rowsByObjectLabel = new Map<string, PivotedStatisticRow>()

  for (const statistic of statisticsToPivot) {
    if (statistic.groupLabel === null) continue

    const row = rowsByObjectLabel.get(statistic.label)
      ?? { objectKey: statistic.key, objectLabel: statistic.label, cellsByActionLabel: {}, totalValueAcrossActions: 0 }
    row.cellsByActionLabel[statistic.groupLabel] = {
      slug: statistic.slug,
      maxValue: statistic.maxValue,
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

function buildActionColumns(statisticsToPivot: StatisticListItemDto[]): TableColumn<PivotedStatisticRow>[] {
  const actionLabels = [...new Set(
    statisticsToPivot.map(statistic => statistic.groupLabel).filter((label): label is string => label !== null)
  )].sort()

  return actionLabels.map(actionLabel => ({
    id: actionLabel,
    header: actionLabel,
    cell: ({ row }: { row: { original: PivotedStatisticRow } }) => {
      const cell = row.original.cellsByActionLabel[actionLabel]
      if (!cell || cell.leaders.length === 0) return '–'

      const primaryLeader = cell.leaders[0]!
      const allLeaderNames = cell.leaders.map(leader => leader.displayName).join(', ')

      return h('button', {
        type: 'button',
        class: 'flex items-center gap-1.5 hover:opacity-80',
        title: allLeaderNames,
        onClick: (event: MouseEvent) => {
          event.stopPropagation()
          navigateTo(`/statistiken/${cell.slug}`)
        }
      }, [
        h('img', {
          src: buildMinecraftAvatarIconUrl(primaryLeader.minecraftUuid),
          alt: allLeaderNames,
          class: 'size-6 rounded'
        }),
        h('span', { class: 'text-sm tabular-nums' }, cell.maxValue.toLocaleString('de-DE'))
      ])
    }
  }))
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
  ...buildActionColumns(itemStatistics.value),
  totalValueAcrossActionsColumn
])

const entityPivotRows = computed(() =>
  sortRowsByTotalValueAcrossActionsDescending(buildPivotedStatisticRows(entityStatistics.value))
)
const entityPivotColumns = computed<TableColumn<PivotedStatisticRow>[]>(() => [
  { accessorKey: 'objectLabel', header: 'Objekt' },
  ...buildActionColumns(entityStatistics.value),
  totalValueAcrossActionsColumn
])
</script>

<template>
  <UContainer class="py-10 space-y-10">
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

    <section class="space-y-3">
      <h2 class="text-lg font-medium">
        Allgemein
      </h2>
      <UTable
        :data="generalStatistics"
        :columns="generalStatisticTableColumns"
        @select="openStatisticDetail"
      >
        <template #leader-cell="{ row }">
          {{ row.original.leaders.map(leader => leader.displayName).join(', ') || '–' }}
        </template>
      </UTable>
    </section>

    <section class="space-y-3">
      <UTabs :items="itemsAndEntitiesTabItems">
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
    </section>
  </UContainer>
</template>
