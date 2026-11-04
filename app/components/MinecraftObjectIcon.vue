<script setup lang="ts">
const props = defineProps<{
  src: string | null
  isLoading: boolean
  alt: string
  kind: 'item' | 'entity'
}>()

const sizeClassByKind: Record<typeof props.kind, string> = {
  item: 'size-8',
  entity: 'size-16'
}

const sizeClass = computed(() => sizeClassByKind[props.kind])

// tables render up to 1300 icons: a plain element is much cheaper than USkeleton or UIcon, and since every pulsing element
// becomes its own compositor layer, only the rows that can be on screen while the icons load do pulse
const LOADING_INDICATOR_CLASS = 'rounded-sm bg-elevated motion-safe:animate-pulse [tr:nth-child(n+41)_&]:animate-none'

const isSrcEmbeddedInBundle = computed(() => props.src?.startsWith('data:') ?? false)
// remembered per src instead of as a flag because table rows can reuse this component for another icon
const arrivedSeparateIconSrc = ref<string | null>(null)
const failedSeparateIconSrc = ref<string | null>(null)
</script>

<template>
  <img
    v-if="isSrcEmbeddedInBundle"
    :src="src!"
    :alt="alt"
    :title="alt"
    :class="sizeClass"
    class="shrink-0 object-contain [image-rendering:pixelated]"
    decoding="async"
  >
  <!-- loading comes before src because Firefox otherwise starts the download right away -->
  <img
    v-else-if="src && src !== failedSeparateIconSrc"
    loading="lazy"
    :src="src"
    :alt="alt"
    :title="alt"
    :class="[sizeClass, src !== arrivedSeparateIconSrc && LOADING_INDICATOR_CLASS]"
    class="shrink-0 object-contain [image-rendering:pixelated]"
    decoding="async"
    @load="arrivedSeparateIconSrc = src"
    @error="failedSeparateIconSrc = src"
  >
  <span
    v-else-if="isLoading"
    :title="alt"
    :class="[sizeClass, LOADING_INDICATOR_CLASS]"
    class="inline-block shrink-0"
  />
  <UIcon
    v-else
    name="i-lucide-box"
    :title="alt"
    :class="sizeClass"
    class="shrink-0 text-muted"
  />
</template>
