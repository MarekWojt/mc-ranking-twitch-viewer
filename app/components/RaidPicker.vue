<script setup lang="ts">
const ROLL_STEP_COUNT = 18
const FIRST_ROLL_STEP_DELAY_MILLISECONDS = 50
const ROLL_STEP_DELAY_GROWTH_MILLISECONDS = 1.2
const COPY_CONFIRMATION_DURATION_MILLISECONDS = 1500

const isOpen = ref(false)
const mustBeOnMinecraftServer = ref(true)
const {
  participants,
  isLoading: isLoadingParticipants,
  ensureRecentParticipants
} = useRecentParticipantList()
const displayedParticipantId = ref<string | null>(null)
const isRolling = ref(false)
const hasCopiedRaidCommand = ref(false)
const raidCommandInput = useTemplateRef<{ inputRef: HTMLInputElement | null }>('raidCommandInput')

const displayedParticipant = computed(() =>
  participants.value.find(participant => participant.id === displayedParticipantId.value) ?? null
)

const raidCandidates = computed(() => participants.value.filter(participant =>
  participant.isLiveOnTwitch
  && participant.twitchLogin !== null
  && (!mustBeOnMinecraftServer.value || participant.isOnlineOnMinecraftServer)
))

const isDisplayedParticipantStillEligible = computed(() =>
  raidCandidates.value.some(candidate => candidate.id === displayedParticipantId.value)
)

const isMissingRequiredMinecraftServerPresence = computed(() =>
  mustBeOnMinecraftServer.value && displayedParticipant.value?.isOnlineOnMinecraftServer === false
)

const raidCommand = computed(() =>
  !isRolling.value && displayedParticipant.value?.twitchLogin ? `/raid ${displayedParticipant.value.twitchLogin}` : ''
)

const emptyStateMessage = computed(() => mustBeOnMinecraftServer.value
  ? 'Gerade ist niemand live, der auch auf dem Server ist.'
  : 'Gerade ist niemand live.'
)

function resolveAvatarUrl(participant: ParticipantListItemDto): string {
  return participant.twitchProfileImageUrl ?? buildMinecraftAvatarRenderUrl(participant.minecraftUuid, 'avatar')
}

function pickRandomParticipant(candidates: ParticipantListItemDto[], participantIdsToAvoid: (string | null)[]): ParticipantListItemDto | null {
  const preferredPool = candidates.filter(candidate => !participantIdsToAvoid.includes(candidate.id))
  const pool = preferredPool.length > 0 ? preferredPool : candidates
  return pool[Math.floor(Math.random() * pool.length)] ?? null
}

// built backwards from the winner so the reel always ends on the winner and never shows the same participant twice
// in a row, which with only two candidates depends on the parity of the step count
function buildRollSequence(candidates: ParticipantListItemDto[], winner: ParticipantListItemDto, initiallyDisplayedId: string | null): string[] {
  const participantIds = [winner.id]
  while (participantIds.length < ROLL_STEP_COUNT) {
    participantIds.unshift(pickRandomParticipant(candidates, [participantIds[0]!])!.id)
  }
  if (participantIds[0] === initiallyDisplayedId) participantIds.shift()
  return participantIds
}

function calculateRollStepDelay(step: number): number {
  return FIRST_ROLL_STEP_DELAY_MILLISECONDS + ROLL_STEP_DELAY_GROWTH_MILLISECONDS * step * step
}

function waitMilliseconds(milliseconds: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// a newer roll (reroll click, closing the modal) must stop the animation loop of an older one
let latestRollId = 0

async function rollRaidTarget() {
  const rollId = ++latestRollId
  const candidates = raidCandidates.value
  // every candidate gets the same chance, including the currently displayed one; only the animation avoids repeats
  const winner = pickRandomParticipant(candidates, [])
  hasCopiedRaidCommand.value = false

  if (!winner) {
    displayedParticipantId.value = null
    isRolling.value = false
    return
  }

  if (candidates.length > 1 && !prefersReducedMotion()) {
    isRolling.value = true
    for (const [step, participantId] of buildRollSequence(candidates, winner, displayedParticipantId.value).entries()) {
      displayedParticipantId.value = participantId
      await waitMilliseconds(calculateRollStepDelay(step))
      if (rollId !== latestRollId) return
    }
  }

  displayedParticipantId.value = winner.id
  isRolling.value = false
}

async function rollRaidTargetFromRecentParticipants() {
  await ensureRecentParticipants()
  // the modal may have been closed while the participants were loading
  if (!isOpen.value) return
  await rollRaidTarget()
}

let participantRefreshIntervalId: ReturnType<typeof setInterval> | undefined

function stopRefreshingParticipants() {
  clearInterval(participantRefreshIntervalId)
  participantRefreshIntervalId = undefined
}

watch(isOpen, async (open) => {
  stopRefreshingParticipants()
  if (!open) {
    latestRollId++
    isRolling.value = false
    return
  }
  participantRefreshIntervalId = setInterval(ensureRecentParticipants, DATA_POLLING_INTERVAL_MILLISECONDS)
  displayedParticipantId.value = null
  await rollRaidTargetFromRecentParticipants()
})

onBeforeUnmount(stopRefreshingParticipants)

function selectRaidCommandText() {
  raidCommandInput.value?.inputRef?.select()
}

async function copyRaidCommand() {
  try {
    await navigator.clipboard.writeText(raidCommand.value)
    hasCopiedRaidCommand.value = true
    setTimeout(() => {
      hasCopiedRaidCommand.value = false
    }, COPY_CONFIRMATION_DURATION_MILLISECONDS)
  } catch {
    // the clipboard API is unavailable outside secure contexts (plain http), so leave the text selected for Ctrl+C
    selectRaidCommandText()
  }
}
</script>

<template>
  <UModal
    v-model:open="isOpen"
    title="Raid auslosen"
    description="Zufällig ausgewählt aus allen Teilnehmern, die gerade live sind."
  >
    <UButton
      icon="i-lucide-dices"
      color="primary"
      variant="solid"
      class="font-semibold"
      aria-label="Raid auslosen"
    >
      <span class="hidden sm:inline">Raid</span>
    </UButton>

    <template #body>
      <div class="space-y-5">
        <UCheckbox
          v-model="mustBeOnMinecraftServer"
          label="Muss auch auf dem Server sein"
        />

        <div class="relative h-24 overflow-hidden rounded-lg bg-elevated/50">
          <div
            v-if="isLoadingParticipants && !displayedParticipant"
            class="absolute inset-0 flex items-center justify-center text-sm text-muted"
          >
            Lade Teilnehmer …
          </div>
          <div
            v-else-if="!displayedParticipant && raidCandidates.length === 0"
            class="absolute inset-0 flex flex-col items-center justify-center gap-1 px-4 text-center text-sm text-muted"
          >
            <span>{{ emptyStateMessage }}</span>
            <span
              v-if="mustBeOnMinecraftServer"
              class="text-xs text-dimmed"
            >Ohne Häkchen werden alle Live-Teilnehmer berücksichtigt.</span>
          </div>
          <div
            v-else-if="!displayedParticipant"
            class="absolute inset-0 flex flex-col items-center justify-center gap-1 px-4 text-center text-sm text-muted"
          >
            <span>Noch niemand ausgelost.</span>
            <span class="text-xs text-dimmed">Mit „Neu auslosen“ geht es los.</span>
          </div>
          <Transition
            v-else
            :name="isRolling ? 'raid-roll' : 'raid-reveal'"
            appear
          >
            <component
              :is="isRolling ? 'div' : 'a'"
              v-if="displayedParticipant"
              :key="`${displayedParticipant.id}-${isRolling}`"
              :href="isRolling ? undefined : `https://twitch.tv/${displayedParticipant.twitchLogin}`"
              :target="isRolling ? undefined : '_blank'"
              class="group absolute inset-0 flex items-center gap-4 px-4"
              :class="{ 'transition-colors hover:bg-elevated': !isRolling }"
            >
              <img
                :src="resolveAvatarUrl(displayedParticipant)"
                :alt="displayedParticipant.displayName"
                class="size-14 shrink-0 rounded-full object-cover transition"
                :class="{
                  'ring-4 ring-primary/60': !isRolling && isDisplayedParticipantStillEligible,
                  'grayscale opacity-60': !isRolling && !isDisplayedParticipantStillEligible
                }"
              >
              <div class="min-w-0">
                <div class="flex min-w-0 items-center gap-2">
                  <p
                    class="truncate text-lg font-semibold"
                    :class="{ 'group-hover:text-primary group-hover:underline': !isRolling }"
                  >
                    {{ displayedParticipant.displayName }}
                  </p>
                  <template v-if="!isRolling">
                    <UBadge
                      :label="displayedParticipant.isLiveOnTwitch ? 'Live' : 'Offline'"
                      :color="displayedParticipant.isLiveOnTwitch ? 'error' : 'neutral'"
                      variant="subtle"
                      size="sm"
                      class="shrink-0"
                    />
                    <UBadge
                      :label="displayedParticipant.isOnlineOnMinecraftServer ? 'Auf dem Server' : 'Nicht auf dem Server'"
                      :color="displayedParticipant.isOnlineOnMinecraftServer ? 'success' : isMissingRequiredMinecraftServerPresence ? 'warning' : 'neutral'"
                      variant="subtle"
                      size="sm"
                      class="shrink-0"
                    />
                  </template>
                </div>
                <p
                  v-if="!isRolling && displayedParticipant.twitchStreamTitle"
                  class="truncate text-sm text-muted"
                  :title="displayedParticipant.twitchStreamTitle"
                >
                  {{ displayedParticipant.twitchStreamTitle }}
                </p>
                <p
                  v-if="!isRolling && displayedParticipant.twitchStreamGame"
                  class="truncate text-xs text-dimmed"
                >
                  {{ displayedParticipant.twitchStreamGame }}
                </p>
              </div>
            </component>
          </Transition>
        </div>

        <p
          v-if="displayedParticipant && !isRolling && !isDisplayedParticipantStillEligible"
          class="-mt-3 flex items-center gap-1.5 text-xs text-warning"
        >
          <UIcon
            name="i-lucide-triangle-alert"
            class="size-3.5 shrink-0"
          />
          Passt nicht mehr zur Auswahl – „Neu auslosen“ zieht jemand Passenden.
        </p>

        <UInput
          ref="raidCommandInput"
          :model-value="raidCommand"
          readonly
          placeholder="/raid …"
          class="w-full font-mono"
          :ui="{ trailing: 'pe-1' }"
          @focus="selectRaidCommandText"
        >
          <template #trailing>
            <UButton
              :icon="hasCopiedRaidCommand ? 'i-lucide-check' : 'i-lucide-copy'"
              :color="hasCopiedRaidCommand ? 'success' : 'neutral'"
              variant="link"
              size="sm"
              :disabled="!raidCommand"
              :aria-label="hasCopiedRaidCommand ? 'Kopiert' : 'Raid-Befehl kopieren'"
              @click="copyRaidCommand"
            />
          </template>
        </UInput>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full items-center justify-between gap-3">
        <span class="text-xs text-muted">
          {{ raidCandidates.length }} Teilnehmer zur Auswahl
        </span>
        <div class="flex items-center gap-2">
          <UButton
            v-if="displayedParticipant && !isRolling"
            :to="`https://twitch.tv/${displayedParticipant.twitchLogin}`"
            target="_blank"
            icon="i-simple-icons-twitch"
            color="neutral"
            variant="ghost"
            label="Zum Kanal"
          />
          <UButton
            icon="i-lucide-refresh-cw"
            label="Neu auslosen"
            :loading="isRolling || isLoadingParticipants"
            @click="rollRaidTargetFromRecentParticipants"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>

<style scoped>
.raid-roll-enter-active,
.raid-roll-leave-active {
  transition: transform 90ms ease-out, opacity 90ms ease-out;
}

.raid-roll-enter-from {
  transform: translateY(60%);
  opacity: 0;
}

.raid-roll-leave-to {
  transform: translateY(-60%);
  opacity: 0;
}

.raid-reveal-enter-active {
  animation: raid-winner-pop 450ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

.raid-reveal-leave-active {
  transition: opacity 90ms ease-out;
}

.raid-reveal-leave-to {
  opacity: 0;
}

@keyframes raid-winner-pop {
  0% {
    transform: scale(0.85);
    opacity: 0;
  }

  60% {
    transform: scale(1.04);
    opacity: 1;
  }

  100% {
    transform: scale(1);
  }
}
</style>
