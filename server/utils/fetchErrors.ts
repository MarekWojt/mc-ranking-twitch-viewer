function hasFetchErrorStatus(error: unknown, status: number): boolean {
  return (error as { response?: { status?: number } })?.response?.status === status
    || (error as { statusCode?: number })?.statusCode === status
}

export function isNotFoundFetchError(error: unknown): boolean {
  return hasFetchErrorStatus(error, 404)
}

export function isUnauthorizedFetchError(error: unknown): boolean {
  return hasFetchErrorStatus(error, 401)
}
