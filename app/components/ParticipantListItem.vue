<script setup lang="ts">
const props = defineProps<{
  participant: ParticipantListItemDto
}>()

const twitchChannelUrl = computed(() =>
  props.participant.twitchLogin ? `https://twitch.tv/${props.participant.twitchLogin}` : null
)

const primaryActionUrl = computed(() =>
  twitchChannelUrl.value ?? `/teilnehmer/${props.participant.id}`
)
</script>

<template>
  <UCard :ui="{ body: 'flex items-center justify-between gap-4 flex-wrap' }">
    <NuxtLink
      :to="primaryActionUrl"
      :target="twitchChannelUrl ? '_blank' : undefined"
      class="flex items-center gap-3 font-medium hover:text-primary"
    >
      <RankBadge :rank="participant.rank" />
      {{ participant.displayName }}
    </NuxtLink>

    <div class="flex items-center gap-2">
      <TwitchLiveBadge v-if="participant.isLiveOnTwitch" />
      <MinecraftOnlineBadge v-if="participant.isOnlineOnMinecraftServer" />

      <UButton
        :to="`/teilnehmer/${participant.id}`"
        icon="i-lucide-bar-chart-3"
        color="neutral"
        variant="ghost"
        size="sm"
        aria-label="Statistiken öffnen"
      />
    </div>
  </UCard>
</template>
