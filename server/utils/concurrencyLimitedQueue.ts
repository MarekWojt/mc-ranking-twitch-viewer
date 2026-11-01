export interface QueuedTaskOptions {
  // background tasks only start while no other task is queued, so a burst of them never delays a request someone waits for
  isBackgroundTask?: boolean
}

export function createConcurrencyLimitedQueue(maxConcurrentTasks: number, minDelayBetweenTaskStartsMilliseconds: number) {
  let runningTaskCount = 0
  let lastTaskStartTime = 0
  const awaitedTaskStarters: (() => void)[] = []
  const backgroundTaskStarters: (() => void)[] = []

  function tryStartNextTask() {
    if (runningTaskCount >= maxConcurrentTasks) return
    if (awaitedTaskStarters.length === 0 && backgroundTaskStarters.length === 0) return

    const elapsedSinceLastStart = Date.now() - lastTaskStartTime
    if (elapsedSinceLastStart < minDelayBetweenTaskStartsMilliseconds) {
      setTimeout(tryStartNextTask, minDelayBetweenTaskStartsMilliseconds - elapsedSinceLastStart)
      return
    }

    const startTask = (awaitedTaskStarters.shift() ?? backgroundTaskStarters.shift())!
    lastTaskStartTime = Date.now()
    runningTaskCount++
    startTask()
  }

  return function enqueue<T>(task: () => Promise<T>, { isBackgroundTask = false }: QueuedTaskOptions = {}): Promise<T> {
    return new Promise((resolve, reject) => {
      const taskStarters = isBackgroundTask ? backgroundTaskStarters : awaitedTaskStarters
      taskStarters.push(() => {
        task()
          .then(resolve, reject)
          .finally(() => {
            runningTaskCount--
            tryStartNextTask()
          })
      })
      tryStartNextTask()
    })
  }
}
