<script setup lang="ts">
const props = defineProps<{
  src: string | null
  alt: string
  kind: 'item' | 'entity'
}>()

const sizeClassByKind: Record<typeof props.kind, string> = {
  item: 'size-8',
  entity: 'size-16'
}

const sizeClass = computed(() => sizeClassByKind[props.kind])
</script>

<template>
  <img
    v-if="src"
    :src="src"
    :alt="alt"
    :title="alt"
    :class="sizeClass"
    class="shrink-0 object-contain [image-rendering:pixelated]"
  >
  <UIcon
    v-else
    name="i-lucide-box"
    :title="alt"
    :class="sizeClass"
    class="shrink-0 text-muted"
  />
</template>
