import type { AsyncData, NuxtError } from '#app'
import type { MaybeRefOrGetter } from 'vue'

// the production proxy used to let browsers keep API responses for 14 days without asking again; copies cached back then
// are tied to the old URLs, and a build-specific query parameter makes browsers ask the server again after every deploy
export function useApiCacheBustingQuery(): Record<string, string> {
  return { build: useRuntimeConfig().app.buildId }
}

// Nuxt empties the data when a refresh fails (e.g. while the server restarts), which would blank the page until the next
// successful refresh; the freshness note still shows how old the kept response is
export async function keepPreviousResponseIfRefreshFails<ApiResponse>(
  fetchResponse: () => Promise<ApiResponse>,
  previousResponse: ApiResponse | undefined,
  signal: AbortSignal
): Promise<ApiResponse> {
  try {
    return await fetchResponse()
  } catch (error) {
    if (previousResponse !== undefined && !signal.aborted) return previousResponse
    throw error
  }
}

// the casts are needed because the types Nuxt derives for a response stay unresolved as long as ApiResponse is still generic
export function useApiFetch<ApiResponse>(url: MaybeRefOrGetter<string>): AsyncData<ApiResponse | undefined, NuxtError | undefined> {
  const apiCacheBustingQuery = useApiCacheBustingQuery()
  const buildDataKey = () => `api:${toValue(url)}`

  return useAsyncData(buildDataKey, (nuxtApp, { signal }) => keepPreviousResponseIfRefreshFails(
    () => $fetch<ApiResponse>(toValue(url), { signal, query: apiCacheBustingQuery }) as Promise<ApiResponse>,
    nuxtApp.payload.data[buildDataKey()] as ApiResponse | undefined,
    signal
  )) as AsyncData<ApiResponse | undefined, NuxtError | undefined>
}
