export interface TimestampedValue<T> {
  value: T
  fetchedAt: string
}

export type DataVersionTopic = 'scores' | 'status' | 'iconBundle'

export type DataVersions = Partial<Record<DataVersionTopic, string>>

export interface DataWithFreshness<T> {
  asOf: string
  dataVersions: DataVersions
  payload: T
}

export interface ScoredDataWithFreshness<T> extends DataWithFreshness<T> {
  scoreGroupFactors: Record<ScoreGroup, number>
}

export interface LiveUpdateDto {
  asOf: string
  dataVersions: Required<DataVersions>
}
