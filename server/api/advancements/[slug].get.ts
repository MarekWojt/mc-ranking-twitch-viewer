export default defineEventHandler(async (event): Promise<DataWithFreshness<AdvancementDetailDto>> => {
  const slug = getRouterParam(event, 'slug')
  const advancementId = slug ? decodeAdvancementSlug(slug) : null

  if (!advancementId) {
    throw createError({ statusCode: 404, statusMessage: 'Advancement nicht gefunden' })
  }

  const scoreboard = await loadScoredAdvancements()
  const scoredAdvancement = scoreboard.advancements.find(entry => entry.definition.id === advancementId)

  if (!scoredAdvancement) {
    throw createError({ statusCode: 404, statusMessage: 'Advancement nicht gefunden' })
  }

  const participantRows = scoreboard.participants
    .filter(participant => scoredAdvancement.completedAtByParticipantId[participant.id] !== undefined)
    .map((participant): AdvancementParticipantRowDto => {
      const completedAt = scoredAdvancement.completedAtByParticipantId[participant.id] ?? null
      return {
        participantId: participant.id,
        displayName: participant.displayName,
        minecraftUuid: participant.minecraftUuid,
        points: scoredAdvancement.points,
        completedAt,
        completedAtDisplay: formatAdvancementCompletedAt(completedAt)
      }
    })
    .sort((a, b) => {
      if (a.completedAt === null) return 1
      if (b.completedAt === null) return -1
      return a.completedAt.localeCompare(b.completedAt)
    })

  return {
    asOf: scoreboard.asOf,
    payload: {
      slug: scoredAdvancement.definition.slug,
      label: scoredAdvancement.definition.label,
      description: scoredAdvancement.definition.description,
      groupLabel: scoredAdvancement.definition.groupLabel,
      participantCount: scoredAdvancement.participantCount,
      points: scoredAdvancement.points,
      participants: participantRows
    }
  }
})
