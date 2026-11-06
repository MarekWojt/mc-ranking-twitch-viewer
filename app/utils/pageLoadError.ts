import type { NuxtError } from '#app'

// something only counts as missing when the server said so, not when it cannot be reached for a moment, for example during a deploy;
// fatal only in the browser, where Nuxt would otherwise just log the error and leave the page empty: on the server every error shows
// the error page anyway, and a fatal one would also log a stack trace for every mistyped address
export function createPageLoadError(loadError: NuxtError, notFoundMessage = 'Seite nicht gefunden') {
  const isMissing = loadError.statusCode === 404
  return createError({
    statusCode: isMissing ? 404 : 503,
    statusMessage: isMissing ? notFoundMessage : 'Seite konnte nicht geladen werden',
    fatal: import.meta.client
  })
}
