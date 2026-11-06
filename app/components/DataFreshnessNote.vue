<script setup lang="ts">
const props = defineProps<{
  asOf: string | null
  dataVersions: DataVersions | undefined
}>()

const { latestLiveUpdate } = useLiveUpdateStream()

// a page without changes stops loading data, so its own date would stand still although the stream keeps confirming it as current;
// data that no longer matches the stream, for example after a failed reload, keeps its own date so that its real age stays visible
const displayedAsOf = computed(() => {
  const liveUpdate = latestLiveUpdate.value
  const isConfirmedByLiveUpdate = props.asOf && liveUpdate && liveUpdate.asOf > props.asOf && areDataVersionsCurrent(props.dataVersions, liveUpdate)
  return isConfirmedByLiveUpdate ? liveUpdate.asOf : props.asOf
})

const formattedAsOfTime = computed(() =>
  displayedAsOf.value ? new Date(displayedAsOf.value).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : null
)
</script>

<template>
  <p
    v-if="formattedAsOfTime"
    class="text-xs text-muted"
  >
    Stand: {{ formattedAsOfTime }} Uhr
  </p>
</template>
