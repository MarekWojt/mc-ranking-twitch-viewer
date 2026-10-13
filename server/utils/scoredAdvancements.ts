export interface ScoredAdvancements {
  asOf: string
  advancements: ScoredAdvancement[]
  participants: Participant[]
  scoreGroupFactors: PointsByScoreGroup
}

export async function loadScoredAdvancements(): Promise<ScoredAdvancements> {
  try {
    const scoreboard = await computeScoreboard()
    return {
      asOf: scoreboard.asOf,
      advancements: scoreboard.advancements,
      participants: scoreboard.participants.map(scoredParticipant => scoredParticipant.participant),
      scoreGroupFactors: scoreboard.scoreGroupFactors
    }
  } catch (error) {
    // advancement pages only need advancement data, so a failing stats/online-status load must not take them down too
    console.error('Gesamtwertung konnte nicht berechnet werden, Advancements werden ohne Kategorie-Faktor angezeigt:', error)
    const advancementScoreboard = await computeAdvancementScoreboard()
    return {
      asOf: advancementScoreboard.asOf,
      advancements: advancementScoreboard.advancements,
      participants: advancementScoreboard.participants,
      scoreGroupFactors: NEUTRAL_SCORE_GROUP_FACTORS
    }
  }
}
