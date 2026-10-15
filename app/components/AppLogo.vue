<script setup lang="ts">
const { serverName } = useRuntimeConfig().public

// bound instead of a static src, because Vite would otherwise try to bundle the path as an asset file
const SERVER_LOGO_PATH = '/branding/logo'
</script>

<template>
  <img
    :src="SERVER_LOGO_PATH"
    :alt="serverName"
    class="h-6 w-auto max-w-40 shrink-0 object-contain"
  >
</template>
