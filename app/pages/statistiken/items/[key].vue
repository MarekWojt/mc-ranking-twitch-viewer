<script setup lang="ts">
const route = useRoute()
const bareKey = route.params.key as string
</script>

<template>
  <ObjectStatisticDetailView
    kind="items"
    :bare-key="bareKey"
  />
</template>
