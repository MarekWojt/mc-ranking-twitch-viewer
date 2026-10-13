export default defineEventHandler(async (): Promise<ScoredDataWithFreshness<AdvancementListItemDto[]>> => {
  const scoreboard = await loadScoredAdvancements()

  const advancements = scoreboard.advancements
    .map(scoredAdvancement => ({ scoredAdvancement, mostRecentCompletedAt: mostRecentAdvancementCompletionTimestamp(scoredAdvancement) }))
    .sort((a, b) => compareAdvancementsByRarityThenRecency(
      a.scoredAdvancement.points, a.mostRecentCompletedAt,
      b.scoredAdvancement.points, b.mostRecentCompletedAt
    ))
    .map(({ scoredAdvancement, mostRecentCompletedAt }): AdvancementListItemDto => ({
      slug: scoredAdvancement.definition.slug,
      category: scoredAdvancement.definition.category,
      label: scoredAdvancement.definition.label,
      description: scoredAdvancement.definition.description,
      groupLabel: scoredAdvancement.definition.groupLabel,
      participantCount: scoredAdvancement.participantCount,
      points: scoredAdvancement.points,
      mostRecentCompletedAt,
      mostRecentCompletedAtDisplay: formatAdvancementCompletedAt(mostRecentCompletedAt)
    }))

  return { asOf: scoreboard.asOf, scoreGroupFactors: scoreboard.scoreGroupFactors, payload: advancements }
})
