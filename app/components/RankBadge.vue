<script setup lang="ts">
defineProps<{
  rank: number
}>()
</script>

<template>
  <UBadge
    color="neutral"
    variant="subtle"
  >
    #{{ rank }}
  </UBadge>
</template>
