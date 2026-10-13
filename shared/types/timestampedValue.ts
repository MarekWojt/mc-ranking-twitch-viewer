export interface TimestampedValue<T> {
  value: T
  fetchedAt: string
}

export interface DataWithFreshness<T> {
  asOf: string
  payload: T
}

export interface ScoredDataWithFreshness<T> extends DataWithFreshness<T> {
  scoreGroupFactors: Record<ScoreGroup, number>
}
