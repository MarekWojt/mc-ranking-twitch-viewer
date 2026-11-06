export default defineEventHandler((event) => {
  const eventStream = createEventStream(event)

  const unsubscribe = subscribeToLiveUpdates({
    receive: liveUpdate => eventStream.push(JSON.stringify(liveUpdate)),
    close: () => eventStream.close()
  })

  eventStream.onClosed(async () => {
    unsubscribe()
    await eventStream.close()
  })

  return eventStream.send()
})
