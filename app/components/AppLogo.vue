<script setup lang="ts">
const { serverLogoUrl, serverName } = useRuntimeConfig().public
</script>

<template>
  <img
    :src="serverLogoUrl"
    :alt="serverName"
    class="h-full w-auto"
  >
</template>
