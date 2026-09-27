export interface TimestampedValue<T> {
  value: T
  fetchedAt: string
}

export interface DataWithFreshness<T> {
  asOf: string
  payload: T
}
