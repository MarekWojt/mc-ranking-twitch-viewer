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

const tableColumns = computed<TableColumn<ObjectStatisticParticipantRowDto>[]>(() => [
  { accessorKey: 'displayName', header: 'Spieler', enableSorting: false },
  ...actionLabels.value.map((actionLabel): TableColumn<ObjectStatisticParticipantRowDto> => ({
    id: actionLabel,
    accessorFn: (row: ObjectStatisticParticipantRowDto) => row.valueByActionLabel[actionLabel] ?? 0,
    header: ({ column }: { column: SortableColumn }) =>
      renderSortableColumnHeader(column, renderActionColumnHeaderContent(actionLabel, actionIconByLabel.value[actionLabel] ?? null)),
    cell: ({ row }: { row: { original: ObjectStatisticParticipantRowDto } }) => {
      const value = row.original.valueByActionLabel[actionLabel] ?? 0
      if (value === 0) return '–'
      return h('span', { class: 'text-sm tabular-nums' }, row.original.displayValueByActionLabel[actionLabel] ?? value.toLocaleString('de-DE'))
    }
  })),
  {
    id: 'totalValue',
    accessorKey: 'totalValue',
    header: ({ column }: { column: SortableColumn }) => renderSortableColumnHeader(column, 'Gesamt'),
    cell: ({ row }) => renderBoldTabularNumber(row.original.totalValue)
  }
])

const tableInitialState = { sorting: [{ id: 'totalValue', desc: true }] }

function openParticipantDetail(_event: Event, row: { original: ObjectStatisticParticipantRowDto }) {
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
      <DataFreshnessNote :as-of="dataAsOf" />
    </div>

    <UTable
      :data="detail.participants"
      :columns="tableColumns"
      :initial-state="tableInitialState"
      @select="openParticipantDetail"
    >
      <template #displayName-cell="{ row }">
        <span class="font-medium">{{ row.original.displayName }}</span>
      </template>
    </UTable>
  </UContainer>
</template>
