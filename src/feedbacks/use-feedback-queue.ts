import { useCallback, useState } from "react"
import { useRef } from "react"

export function useFeedbackQueue(): FeedbackQueueHooks {
  const queueRef = useRef<FeedbackQueueItem[]>([])
  const runningRef = useRef(false)
  const [state, setState] = useState({ running: false, pending: 0 })

  const syncState = useCallback((): void => {
    setState({
      running: runningRef.current,
      pending: queueRef.current.length,
    })
  }, [])

  const runNext = useCallback((): void => {
    if (runningRef.current) return

    const item = queueRef.current.shift()
    if (!item) {
      syncState()
      return
    }

    runningRef.current = true
    syncState()

    let taskResult: unknown
    try {
      taskResult = item.task()
    } catch (error) {
      item.reject(error)
      runningRef.current = false
      runNext()
      return
    }

    Promise.resolve(taskResult)
      .then(item.resolve, item.reject)
      .finally(() => {
        runningRef.current = false
        runNext()
      })
  }, [syncState])

  const enqueue = useCallback(<Result,>(task: () => Result | Promise<Result>): Promise<Result> => {
    return new Promise<Result>((resolve, reject) => {
      queueRef.current.push({
        task,
        resolve: resolve as (value: unknown) => void,
        reject,
      })
      syncState()
      runNext()
    })
  }, [runNext, syncState])

  const clear = useCallback((reason?: unknown): void => {
    const pending = queueRef.current.splice(0)
    pending.forEach((item) => {
      item.reject(reason)
    })
    syncState()
  }, [syncState])

  return { running: state.running, pending: state.pending, enqueue, clear }
}

type FeedbackQueueItem = {
  task: () => unknown
  resolve: (value: unknown) => void
  reject: (reason?: unknown) => void
}

export type FeedbackQueueHooks = {
  running: boolean
  pending: number
  enqueue: <Result>(task: () => Result | Promise<Result>) => Promise<Result>
  clear: (reason?: unknown) => void
}
