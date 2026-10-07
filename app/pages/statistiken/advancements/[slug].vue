<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

const route = useRoute()
const advancementSlug = route.params.slug as string

const { data: response, refresh } = await useFetch<DataWithFreshness<AdvancementDetailDto>>(`/api/advancements/${advancementSlug}`)

if (!response.value) {
  throw createError({ statusCode: 404, statusMessage: 'Advancement nicht gefunden' })
}

useAutoRefresh(refresh, DATA_POLLING_INTERVAL_MILLISECONDS)

const { resolvedAdvancementsLocale } = useMinecraftNameLocale()

// single place where the raw bilingual API payload is resolved into plain display strings for the currently selected locale - everything below this point works with plain strings only
const advancement = computed(() => {
  const rawAdvancement = response.value?.payload
  if (!rawAdvancement) return null

  const locale = resolvedAdvancementsLocale.value
  return {
    ...rawAdvancement,
    label: resolveLocalizedLabel(rawAdvancement.label, locale),
    description: rawAdvancement.description ? resolveLocalizedOptionalText(rawAdvancement.description, locale) : null,
    groupLabel: resolveLocalizedLabel(rawAdvancement.groupLabel, locale)
  }
})
const dataAsOf = computed(() => response.value?.asOf ?? null)

const { data: iconBundle } = await useFetch<MinecraftIconBundleDto>('/api/icons/minecraft-bundle')

const advancementIconSrc = computed(() => iconBundle.value?.advancementIconsBySlug[advancementSlug] ?? null)

const participantTableColumns: TableColumn<AdvancementParticipantRowDto>[] = [
  { accessorKey: 'displayName', header: 'Teilnehmer' },
  { accessorKey: 'completedAtDisplay', header: 'Erreicht am', meta: { class: { th: 'text-center', td: 'text-center' } } },
  {
    accessorKey: 'points',
    header: 'Punkte',
    meta: { class: { th: 'text-right', td: 'text-right' } },
    cell: ({ row }) => Math.round(row.original.points)
  }
]

function openParticipantDetail(_event: Event, row: { original: AdvancementParticipantRowDto }) {
  navigateTo(`/teilnehmer/${row.original.participantId}`)
}
</script>

<template>
  <UContainer
    v-if="advancement"
    class="py-10 space-y-6"
  >
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <MinecraftObjectIcon
          :src="advancementIconSrc"
          :alt="advancement.label"
          kind="item"
        />
        <div>
          <h1 class="text-2xl font-semibold">
            {{ advancement.label }}
          </h1>
          <p class="text-sm text-muted">
            {{ advancement.groupLabel }} · {{ advancement.participantCount }} {{ advancement.participantCount === 1 ? 'Spieler hat' : 'Spieler haben' }} dieses Advancement · {{ Math.round(advancement.points) }} Punkte
          </p>
          <p
            v-if="advancement.description"
            class="mt-1 text-sm"
          >
            {{ advancement.description }}
          </p>
        </div>
      </div>
      <DataFreshnessNote :as-of="dataAsOf" />
    </div>

    <UTable
      :data="advancement.participants"
      :columns="participantTableColumns"
      @select="openParticipantDetail"
    >
      <template #displayName-cell="{ row }">
        <div class="flex items-center gap-2">
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
