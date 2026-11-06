export interface ScoredAdvancements {
  asOf: string
  scoresVersion: string
  advancements: ScoredAdvancement[]
  participants: Participant[]
  scoreGroupFactors: PointsByScoreGroup
}

// never equal to a real version, so pages showing these provisional values load again as soon as live updates report the real ones
const SCORES_VERSION_WITHOUT_SCOREBOARD = 'without-scoreboard'

export async function loadScoredAdvancements(): Promise<ScoredAdvancements> {
  try {
    const scoreboard = await getScoreboard()
    return {
      asOf: scoreboard.asOf,
      scoresVersion: scoreboard.scoresVersion,
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
      scoresVersion: SCORES_VERSION_WITHOUT_SCOREBOARD,
      advancements: advancementScoreboard.advancements,
      participants: advancementScoreboard.participants,
      scoreGroupFactors: NEUTRAL_SCORE_GROUP_FACTORS
    }
  }
}
