export type PointsByScoreGroup = Record<ScoreGroup, number>

export interface ParticipantScoreGroupPoints {
  signedPoints: PointsByScoreGroup
  absolutePoints: PointsByScoreGroup
}

const SCORE_GROUPS = Object.keys(SCORE_GROUP_SHARES) as ScoreGroup[]

// below this share of the absolute median, negative weights have (almost) cancelled out the positive ones and the
// signed median would make the factor explode, so the absolute median is used instead
const MINIMUM_SIGNED_TO_ABSOLUTE_MEDIAN_RATIO = 0.25

export const NEUTRAL_SCORE_GROUP_FACTORS: PointsByScoreGroup = Object.fromEntries(
  SCORE_GROUPS.map(group => [group, DEFAULT_STATISTIC_WEIGHT])
) as PointsByScoreGroup

function createEmptyPointsByScoreGroup(): PointsByScoreGroup {
  return Object.fromEntries(SCORE_GROUPS.map(group => [group, 0])) as PointsByScoreGroup
}

export function createParticipantScoreGroupPoints(advancementPoints: number): ParticipantScoreGroupPoints {
  return {
    signedPoints: { ...createEmptyPointsByScoreGroup(), advancements: advancementPoints },
    absolutePoints: { ...createEmptyPointsByScoreGroup(), advancements: advancementPoints }
  }
}

export function addToScoreGroupPoints(participantPoints: ParticipantScoreGroupPoints, group: ScoreGroup, weightedPoints: number): void {
  participantPoints.signedPoints[group] += weightedPoints
  participantPoints.absolutePoints[group] += Math.abs(weightedPoints)
}

function hasPointsInEveryScoreGroup(participantPoints: ParticipantScoreGroupPoints): boolean {
  return SCORE_GROUPS.every(group => participantPoints.signedPoints[group] !== 0)
}

function selectMedianParticipants(allParticipantPoints: ParticipantScoreGroupPoints[], group: ScoreGroup): ParticipantScoreGroupPoints[] {
  const participantsWithPointsInEveryGroup = allParticipantPoints.filter(hasPointsInEveryScoreGroup)
  if (participantsWithPointsInEveryGroup.length > 0) return participantsWithPointsInEveryGroup

  // nobody has points in every group yet (e.g. right after a season start), so fall back to everyone active in this group
  return allParticipantPoints.filter(participantPoints => participantPoints.signedPoints[group] !== 0)
}

function calculateScoreGroupMedian(allParticipantPoints: ParticipantScoreGroupPoints[], group: ScoreGroup): number {
  const medianParticipants = selectMedianParticipants(allParticipantPoints, group)
  const signedMedian = calculateMedian(medianParticipants.map(participantPoints => participantPoints.signedPoints[group]))
  const absoluteMedian = calculateMedian(medianParticipants.map(participantPoints => participantPoints.absolutePoints[group]))

  return signedMedian >= absoluteMedian * MINIMUM_SIGNED_TO_ABSOLUTE_MEDIAN_RATIO ? signedMedian : absoluteMedian
}

export function calculateScoreGroupFactors(allParticipantPoints: ParticipantScoreGroupPoints[]): PointsByScoreGroup {
  const medianByGroup = Object.fromEntries(
    SCORE_GROUPS.map(group => [group, calculateScoreGroupMedian(allParticipantPoints, group)])
  ) as PointsByScoreGroup
  const sumOfMedians = SCORE_GROUPS.reduce((sum, group) => sum + medianByGroup[group], 0)

  return Object.fromEntries(SCORE_GROUPS.map((group) => {
    const median = medianByGroup[group]
    // a zero median means nobody has any points in this group, so every point in it is 0 and the factor has no effect
    if (median === 0) return [group, DEFAULT_STATISTIC_WEIGHT]
    return [group, SCORE_GROUP_SHARES[group] * sumOfMedians / median]
  })) as PointsByScoreGroup
}
