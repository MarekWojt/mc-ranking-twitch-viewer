<script setup lang="ts">
const props = defineProps<{
  participant: ParticipantListItemDto
  showPercentOfLeader?: boolean
}>()

const minecraftBodyRenderUrl = computed(() => buildMinecraftAvatarRenderUrl(props.participant.minecraftUuid, 'body'))
const minecraftBodyRenderFailed = ref(false)

const cardBackgroundClass = computed(() =>
  buildStatusBackgroundClass(props.participant.isLiveOnTwitch, props.participant.isOnlineOnMinecraftServer)
)

const formattedTotalScore = computed(() => formatRoundedPoints(props.participant.totalScore))

const isTwitchButtonHovered = ref(false)
</script>

<template>
  <NuxtLink
    :to="`/teilnehmer/${participant.id}`"
    class="block"
    :class="{ 'hover:opacity-90': !isTwitchButtonHovered }"
  >
    <UCard
      :ui="{ body: 'p-0 sm:p-0' }"
      class="overflow-hidden"
      :class="cardBackgroundClass"
    >
      <div class="relative flex h-64 items-end justify-center pt-4">
        <div class="absolute inset-x-2 top-2 flex items-start">
          <RankBadge :rank="participant.rank" />
        </div>

        <img
          v-if="!minecraftBodyRenderFailed"
          :src="minecraftBodyRenderUrl"
          :alt="`Minecraft-Skin von ${participant.displayName}`"
          class="h-60 w-auto select-none"
          loading="lazy"
          @error="minecraftBodyRenderFailed = true"
        >
        <UIcon
          v-else
          name="i-lucide-user-round"
          class="mb-4 size-28 text-muted"
        />
      </div>

      <div class="flex items-center gap-2 border-t border-default px-3 py-3">
        <button
          v-if="participant.twitchLogin"
          type="button"
          class="relative shrink-0 cursor-pointer hover:opacity-80"
          :title="`Zu Twitch: ${participant.twitchLogin}`"
          @mouseenter="isTwitchButtonHovered = true"
          @mouseleave="isTwitchButtonHovered = false"
          @click.stop.prevent="navigateTo(`https://twitch.tv/${participant.twitchLogin}`, { open: { target: '_blank' } })"
        >
          <img
            v-if="participant.twitchProfileImageUrl"
            :src="participant.twitchProfileImageUrl"
            :alt="`Twitch-Profilbild von ${participant.displayName}`"
            class="size-12 rounded-full"
          >
          <UIcon
            v-else
            name="i-simple-icons-twitch"
            class="size-9 text-muted"
          />
          <span
            v-if="participant.isLiveOnTwitch"
            class="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded bg-error px-1 py-px text-[8px] font-bold tracking-wide text-white uppercase"
          >
            Live
          </span>
        </button>
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
