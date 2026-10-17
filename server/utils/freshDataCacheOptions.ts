// Nitro's default stale-while-revalidate serves an expired entry once more before refreshing it, no matter how old it is,
// so after a quiet night the first visitor would see hours-old stats or online players; these values are cheap to
// reload, so an expired entry is refreshed before answering instead
export const FRESH_DATA_CACHE_OPTIONS = { swr: false }
