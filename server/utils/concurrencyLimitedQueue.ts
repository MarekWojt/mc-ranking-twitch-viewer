export interface QueuedTaskOptions {
  // background tasks only start while no other task is queued, so a burst of them never delays a request someone waits for;
  // asked again before every start, because someone can begin waiting for a task that is already queued
  isBackgroundTask?: () => boolean
}

interface QueuedTask {
  start: () => void
  isBackgroundTask: () => boolean
}

export function createConcurrencyLimitedQueue(maxConcurrentTasks: number, minDelayBetweenTaskStartsMilliseconds: number) {
  let runningTaskCount = 0
  let lastTaskStartTime = 0
  const queuedTasks: QueuedTask[] = []

  function takeNextQueuedTask(): QueuedTask {
    const firstAwaitedTaskIndex = queuedTasks.findIndex(queuedTask => !queuedTask.isBackgroundTask())
    return queuedTasks.splice(Math.max(firstAwaitedTaskIndex, 0), 1)[0]!
  }

  function tryStartNextTask() {
    if (runningTaskCount >= maxConcurrentTasks) return
    if (queuedTasks.length === 0) return

    const elapsedSinceLastStart = Date.now() - lastTaskStartTime
    if (elapsedSinceLastStart < minDelayBetweenTaskStartsMilliseconds) {
      setTimeout(tryStartNextTask, minDelayBetweenTaskStartsMilliseconds - elapsedSinceLastStart)
      return
    }

    const nextTask = takeNextQueuedTask()
    lastTaskStartTime = Date.now()
    runningTaskCount++
    nextTask.start()
  }

  return function enqueue<T>(task: () => Promise<T>, { isBackgroundTask = () => false }: QueuedTaskOptions = {}): Promise<T> {
    return new Promise((resolve, reject) => {
      queuedTasks.push({
        start: () => {
          task()
            .then(resolve, reject)
            .finally(() => {
              runningTaskCount--
              tryStartNextTask()
            })
        },
        isBackgroundTask
      })
      tryStartNextTask()
    })
  }
}
