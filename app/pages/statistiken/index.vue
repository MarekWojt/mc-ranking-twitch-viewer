<script setup lang="ts">
const { data: statistics } = await useFetch<StatisticListItemDto[]>('/api/statistics')

const statisticsSearchQuery = ref('')

const filteredStatistics = computed(() => {
  const searchQuery = statisticsSearchQuery.value.trim().toLowerCase()
  const allStatistics = statistics.value ?? []
  if (searchQuery.length === 0) return allStatistics

  return allStatistics.filter(statistic =>
    `${statistic.groupLabel} ${statistic.label}`.toLowerCase().includes(searchQuery)
  )
})

const generalStatistics = computed(() =>
  filteredStatistics.value.filter(statistic => statistic.group === 'allgemein')
)

const specificStatisticsByGroupLabel = computed(() => {
  const groupedStatistics = new Map<string, StatisticListItemDto[]>()

  for (const statistic of filteredStatistics.value) {
    if (statistic.group !== 'spezifisch' || statistic.groupLabel === null) continue
    const statisticsInGroup = groupedStatistics.get(statistic.groupLabel) ?? []
    statisticsInGroup.push(statistic)
    groupedStatistics.set(statistic.groupLabel, statisticsInGroup)
  }

  return [...groupedStatistics.entries()]
})
</script>

<template>
  <UContainer class="py-10 space-y-8">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-2xl font-semibold">
        Statistiken
      </h1>
      <UInput
        v-model="statisticsSearchQuery"
        icon="i-lucide-search"
        placeholder="Statistik suchen…"
      />
    </div>

    <section class="space-y-3">
      <h2 class="text-lg font-medium">
        Allgemein
      </h2>
      <div class="flex flex-wrap gap-2">
        <UButton
          v-for="statistic in generalStatistics"
          :key="statistic.slug"
          :to="`/statistiken/${statistic.slug}`"
          color="neutral"
          variant="soft"
        >
          {{ statistic.label }}
        </UButton>
      </div>
    </section>

    <section
      v-for="[groupLabel, statisticsInGroup] in specificStatisticsByGroupLabel"
      :key="groupLabel"
      class="space-y-3"
    >
      <h2 class="text-lg font-medium">
        {{ groupLabel }}
      </h2>
      <div class="flex flex-wrap gap-2">
        <UButton
          v-for="statistic in statisticsInGroup"
          :key="statistic.slug"
          :to="`/statistiken/${statistic.slug}`"
          color="neutral"
          variant="soft"
        >
          {{ statistic.label }}
        </UButton>
      </div>
    </section>
  </UContainer>
</template>
