<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()

// not useRoute: it only changes once a page has finished loading, so here it would still lead back to the previous page
const { currentRoute } = useRouter()

const isNotFound = computed(() => props.error.statusCode === 404)

// Nuxt's own message for an unknown address is in English and repeats the address, only ours are written for visitors
const notFoundTitle = computed(() => {
  const message = props.error.statusMessage ?? ''
  return message === '' || /^page not found/i.test(message) ? 'Seite nicht gefunden' : message
})

const errorShownToVisitor = computed(() => isNotFound.value
  ? { statusCode: 404, statusMessage: notFoundTitle.value, message: 'Diesen Link gibt es nicht oder nicht mehr.' }
  : { statusMessage: 'Seite konnte nicht geladen werden', message: 'Bitte versuch es gleich noch einmal.' })
</script>

<template>
  <AppFrame>
    <UError
      as="div"
      :error="errorShownToVisitor"
      :redirect="isNotFound ? '/' : currentRoute.fullPath"
      :clear="isNotFound ? true : { label: 'Erneut versuchen' }"
    />
  </AppFrame>
</template>
