<script setup lang="ts">
const route = useRoute()
const bareKey = route.params.key as string
</script>

<template>
  <ObjectStatisticDetailView
    kind="entities"
    :bare-key="bareKey"
  />
</template>
