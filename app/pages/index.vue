<script setup lang="ts">
const { data: response, refresh } = await useFetch<DataWithFreshness<ParticipantListItemDto[]>>('/api/participants')
useAutoRefresh(refresh, DATA_POLLING_INTERVAL_MILLISECONDS)

const participants = computed(() => response.value?.payload ?? [])
const dataAsOf = computed(() => response.value?.asOf ?? null)

const groupedParticipants = computed(() => groupParticipantsForHomepage(participants.value))

const participantGroupSections = computed(() => [
  { title: 'Online & Live', participants: groupedParticipants.value.onlineAndLive },
  { title: 'Live auf Twitch', participants: groupedParticipants.value.liveOnly },
  { title: 'Online auf dem Server', participants: groupedParticipants.value.onlineOnly },
  { title: 'Alle weiteren Teilnehmer', participants: groupedParticipants.value.neitherOnlineNorLive }
].filter(section => section.participants.length > 0))
</script>

<template>
  <UContainer class="py-10 space-y-8">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-2xl font-semibold">
        Teilnehmer
      </h1>
      <DataFreshnessNote :as-of="dataAsOf" />
    </div>

    <section
      v-for="section in participantGroupSections"
      :key="section.title"
      class="space-y-3"
    >
      <h2 class="text-lg font-medium text-muted">
        {{ section.title }}
      </h2>

      <div class="grid grid-cols-[repeat(auto-fill,minmax(min(200px,100%),1fr))] gap-4">
        <ParticipantCard
          v-for="participant in section.participants"
          :key="participant.id"
          :participant="participant"
        />
      </div>
    </section>
  </UContainer>
</template>
