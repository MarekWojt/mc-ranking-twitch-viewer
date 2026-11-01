// without a timeout a hanging connection keeps a background refresh pending forever, so the value would never be updated again
export const EXTERNAL_REQUEST_TIMEOUT_MILLISECONDS = 10_000
