<script setup lang="ts">
const { data: participants } = await useFetch<ParticipantListItemDto[]>('/api/participants')

const groupedParticipants = computed(() => groupParticipantsForHomepage(participants.value ?? []))

const participantGroupSections = computed(() => [
  { title: 'Online & Live', participants: groupedParticipants.value.onlineAndLive },
  { title: 'Live auf Twitch', participants: groupedParticipants.value.liveOnly },
  { title: 'Online auf dem Server', participants: groupedParticipants.value.onlineOnly },
  { title: 'Alle weiteren Teilnehmer', participants: groupedParticipants.value.neitherOnlineNorLive }
].filter(section => section.participants.length > 0))
</script>

<template>
  <UContainer class="py-10 space-y-8">
    <h1 class="text-2xl font-semibold">
      Teilnehmer
    </h1>

    <section
      v-for="section in participantGroupSections"
      :key="section.title"
      class="space-y-3"
    >
      <h2 class="text-lg font-medium text-muted">
        {{ section.title }}
      </h2>

      <div class="space-y-2">
        <ParticipantListItem
          v-for="participant in section.participants"
          :key="participant.id"
          :participant="participant"
        />
      </div>
    </section>
  </UContainer>
</template>
