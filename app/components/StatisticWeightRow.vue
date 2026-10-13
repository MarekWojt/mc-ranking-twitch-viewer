<script setup lang="ts" generic="TRow">
import type { TableColumn } from '@nuxt/ui'

const props = defineProps<{
  columns: TableColumn<TRow>[]
  scoreGroupFactor: number | undefined
  scoreGroup: ScoreGroup
}>()

interface WeightCell {
  columnId: string
  actionWeight: number | null
  alignmentClass: string
}

function resolveColumnId(column: TableColumn<TRow>): string {
  if (column.id) return column.id
  return 'accessorKey' in column ? String(column.accessorKey) : ''
}

function resolveCellAlignmentClass(column: TableColumn<TRow>): string {
  const cellClass = column.meta?.class?.td
  return typeof cellClass === 'string' ? cellClass : ''
}

function resolveActionWeight(columnId: string): number | null {
  return hasMinecraftNamespace(columnId) ? resolveCategoryWeight(columnId) : null
}

const weightCells = computed<WeightCell[]>(() => props.columns.map((column) => {
  const columnId = resolveColumnId(column)
  return {
    columnId,
    actionWeight: resolveActionWeight(columnId),
    alignmentClass: resolveCellAlignmentClass(column)
  }
}))

// the tables using this row hide their own header separator (ui.separator), so this row always draws it, even with nothing to show
const hasAnyWeight = computed(() =>
  props.scoreGroupFactor !== undefined
  || weightCells.value.some(cell => cell.actionWeight !== null && cell.actionWeight !== DEFAULT_STATISTIC_WEIGHT)
)
</script>

<template>
  <tr
    v-if="hasAnyWeight"
    class="border-b border-accented"
  >
    <td
      v-for="(cell, cellIndex) in weightCells"
      :key="cell.columnId"
      class="px-4 pt-0 pb-2.5"
      :class="cell.alignmentClass"
    >
      <ScoreGroupFactorLabel
        v-if="cellIndex === 0 && scoreGroupFactor !== undefined"
        variant="inline"
        :factor="scoreGroupFactor"
        :score-group="scoreGroup"
      />
      <UBadge
        v-else-if="cell.actionWeight !== null"
        v-bind="buildStatisticWeightBadgeProps(cell.actionWeight)"
        :title="describeCategoryWeight(cell.actionWeight)"
      />
    </td>
  </tr>
  <tr v-else>
    <td
      :colspan="columns.length"
      class="h-0 p-0 border-b border-accented"
    />
  </tr>
</template>
