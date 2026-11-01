export function isNotFoundFetchError(error: unknown): boolean {
  return (error as { response?: { status?: number } })?.response?.status === 404
    || (error as { statusCode?: number })?.statusCode === 404
}
