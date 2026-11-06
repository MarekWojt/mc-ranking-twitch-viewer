// an open stream counts as a running request, so without this every restart with an open tab would wait for Nitro's 30 s shutdown
// timeout; browsers reconnect on their own afterwards
export default defineNitroPlugin(() => {
  process.once('SIGTERM', closeAllLiveUpdateSubscribers)
  process.once('SIGINT', closeAllLiveUpdateSubscribers)
})
