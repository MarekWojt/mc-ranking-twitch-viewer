<script setup lang="ts">
defineProps<{
  factor: number
  scoreGroup: ScoreGroup
  variant: 'inline' | 'notice'
}>()
</script>

<template>
  <UTooltip :text="describeScoreGroupFactor(factor, scoreGroup)">
    <span
      class="inline-flex cursor-help items-center gap-1.5 whitespace-nowrap text-xs tabular-nums"
      :class="variant === 'notice' ? 'pl-2 text-dimmed' : 'text-muted'"
    >
      <UIcon
        v-if="variant === 'notice'"
        name="i-lucide-info"
        class="size-3.5 shrink-0"
      />
      alle {{ formatScoreGroupFactor(factor) }}
    </span>
  </UTooltip>
</template>
