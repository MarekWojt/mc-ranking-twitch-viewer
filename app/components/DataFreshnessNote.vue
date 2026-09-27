<script setup lang="ts">
const props = defineProps<{
  asOf: string | null
}>()

const formattedAsOfTime = computed(() =>
  props.asOf ? new Date(props.asOf).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : null
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
