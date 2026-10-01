export function createConcurrencyLimitedQueue(maxConcurrentTasks: number, minDelayBetweenTaskStartsMilliseconds: number) {
  let runningTaskCount = 0
  let lastTaskStartTime = 0
  const pendingTaskStarters: (() => void)[] = []

  function tryStartNextTask() {
    if (runningTaskCount >= maxConcurrentTasks || pendingTaskStarters.length === 0) return

    const elapsedSinceLastStart = Date.now() - lastTaskStartTime
    if (elapsedSinceLastStart < minDelayBetweenTaskStartsMilliseconds) {
      setTimeout(tryStartNextTask, minDelayBetweenTaskStartsMilliseconds - elapsedSinceLastStart)
      return
    }

    const startTask = pendingTaskStarters.shift()!
    lastTaskStartTime = Date.now()
    runningTaskCount++
    startTask()
  }

  return function enqueue<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      pendingTaskStarters.push(() => {
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
