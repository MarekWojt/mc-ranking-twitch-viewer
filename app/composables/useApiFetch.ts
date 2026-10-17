// the production proxy used to let browsers keep API responses for 14 days without asking again; copies cached back then
// are tied to the old URLs, and a build-specific query parameter makes browsers ask the server again after every deploy
export function useApiCacheBustingQuery(): Record<string, string> {
  return { build: useRuntimeConfig().app.buildId }
}

export const useApiFetch = createUseFetch(options => ({
  query: { ...toValue(options.query), ...useApiCacheBustingQuery() }
}))
