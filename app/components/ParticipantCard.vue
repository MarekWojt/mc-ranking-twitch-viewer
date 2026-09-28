<script setup lang="ts">
const props = defineProps<{
  participant: ParticipantListItemDto
  showPercentOfLeader?: boolean
}>()

const minecraftSkinRenderUrl = computed(() => buildMinecraftBodyRenderUrl(props.participant.minecraftUuid))

const minecraftSkinRenderFailed = ref(false)

const cardBackgroundClass = computed(() =>
  buildStatusBackgroundClass(props.participant.isLiveOnTwitch, props.participant.isOnlineOnMinecraftServer)
)

const formattedTotalScore = computed(() => Math.round(props.participant.totalScore).toLocaleString('de-DE'))
</script>

<template>
  <NuxtLink
    :to="`/teilnehmer/${participant.id}`"
    class="block hover:opacity-90"
  >
    <UCard
      :ui="{ body: 'p-0 sm:p-0' }"
      class="overflow-hidden"
      :class="cardBackgroundClass"
    >
      <div class="relative flex h-64 items-end justify-center pt-4">
        <div class="absolute inset-x-2 top-2 flex items-start justify-between">
          <RankBadge :rank="participant.rank" />
          <span
            v-if="participant.isLiveOnTwitch"
            class="size-3 rounded-full bg-error"
          />
        </div>

        <img
          v-if="!minecraftSkinRenderFailed"
          :src="minecraftSkinRenderUrl"
          :alt="`Minecraft-Skin von ${participant.displayName}`"
          class="h-60 w-auto select-none"
          loading="lazy"
          @error="minecraftSkinRenderFailed = true"
        >
        <UIcon
          v-else
          name="i-lucide-user-round"
          class="mb-4 size-28 text-muted"
        />
      </div>

      <div class="flex items-center gap-2 border-t border-default px-3 py-3">
        <img
          v-if="participant.twitchProfileImageUrl"
          :src="participant.twitchProfileImageUrl"
          :alt="`Twitch-Profilbild von ${participant.displayName}`"
          class="size-9 shrink-0 rounded-full"
        >
        <UIcon
          v-else-if="participant.twitchLogin"
          name="i-simple-icons-twitch"
          class="size-7 shrink-0 text-muted"
        />
        <div class="min-w-0 flex-1">
          <p class="truncate text-lg font-semibold">
            {{ participant.displayName }}
          </p>
          <p class="text-sm text-muted">
            {{ formattedTotalScore }} Punkte
          </p>
        </div>

        <UTooltip
          v-if="showPercentOfLeader"
          text="von Platz 1"
          class="shrink-0 self-end"
        >
          <p class="text-sm text-muted">
            {{ participant.percentOfLeaderScore.toFixed(1) }}%
          </p>
        </UTooltip>
      </div>
    </UCard>
  </NuxtLink>
</template>
