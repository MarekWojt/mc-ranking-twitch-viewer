// Nitro's default stale-while-revalidate serves an expired entry once more before refreshing it, no matter how old it is,
// so after a quiet night the first visitor would see hours-old stats or online players; these values are only read from
// local files within milliseconds, so an expired entry is refreshed before answering instead (anything fetched over the
// network must never be waited for like this and uses createBackgroundRefreshedCache)
export const FRESH_DATA_CACHE_OPTIONS = { swr: false }
