const POINTS_AT_MEDIAN = 50
const POINTS_PER_DOUBLING = 20

export function calculateStatisticPoints(value: number, medianValue: number): number {
  if (medianValue === 0 || value === 0) return 0

  const pointsAboveOrBelowMedian = POINTS_PER_DOUBLING * Math.log2(value / medianValue)
  return Math.max(0, POINTS_AT_MEDIAN + pointsAboveOrBelowMedian)
}
