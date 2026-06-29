import { useCallback, useRef, useState } from "react"

import { ConfirmProps } from "./use-confirm"
import { ToastInput } from "./use-toast"

export function useAsyncFeedback<Args extends unknown[], Value>(
  action: (...args: Args) => Value | Promise<Value>,
  options: AsyncFeedbackOptions<Args, Value> = {},
): AsyncFeedbackHooks<Args, Value> {
  const [pending, setPending] = useState(false)
  const [result, setResult] = useState<AsyncFeedbackResult<Value> | undefined>(undefined)
  const [error, setError] = useState<unknown>(undefined)
  const pendingRunsRef = useRef(0)

  const beginRun = useCallback((): void => {
    pendingRunsRef.current += 1
    setPending(true)
  }, [])

  const endRun = useCallback((): void => {
    pendingRunsRef.current = Math.max(0, pendingRunsRef.current - 1)
    setPending(pendingRunsRef.current > 0)
  }, [])

  const run = useCallback(async (...args: Args): Promise<AsyncFeedbackResult<Value>> => {
    if (options.confirm) {
      const confirmProps = typeof options.confirmProps === "function"
        ? options.confirmProps(...args)
        : options.confirmProps
      const granted = await options.confirm.open(confirmProps)

      if (!granted) {
        const cancelled: AsyncFeedbackResult<Value> = { status: "cancelled" }
        setPending(pendingRunsRef.current > 0)
        setError(undefined)
        setResult(cancelled)
        return cancelled
      }
    }

    beginRun()
    setError(undefined)
    const loadingToast = resolveFeedbackValue(options.loading, args)
    const loadingToastId = loadingToast && options.toast
      ? options.toast.show({ ...loadingToast, variant: loadingToast.variant ?? "info" })
      : undefined

    try {
      const value = await action(...args)
      const success: AsyncFeedbackResult<Value> = { status: "success", value }
      const successToast = resolveFeedbackValue(options.success, [value, ...args] as [Value, ...Args])
      if (successToast) {
        const nextToast = { ...successToast, variant: successToast.variant ?? "success" }
        if (loadingToastId && options.toast?.update) {
          options.toast.update(loadingToastId, nextToast)
        } else {
          options.toast?.show(nextToast)
        }
      } else if (loadingToastId) {
        options.toast?.dismiss?.(loadingToastId)
      }
      setResult(success)
      return success
    } catch (caught) {
      const failure: AsyncFeedbackResult<Value> = { status: "error", error: caught }
      const errorToast = resolveFeedbackValue(options.error, [caught, ...args] as [unknown, ...Args])
      if (errorToast) {
        const nextToast = { ...errorToast, variant: errorToast.variant ?? "error" }
        if (loadingToastId && options.toast?.update) {
          options.toast.update(loadingToastId, nextToast)
        } else {
          options.toast?.show(nextToast)
        }
      } else if (loadingToastId) {
        options.toast?.dismiss?.(loadingToastId)
      }
      setError(caught)
      setResult(failure)
      if (options.throwOnError) {
        throw caught
      }
      return failure
    } finally {
      endRun()
    }
  }, [action, beginRun, endRun, options])

  const reset = useCallback((): void => {
    pendingRunsRef.current = 0
    setPending(false)
    setError(undefined)
    setResult(undefined)
  }, [])

  return { pending, result, error, run, reset }
}

function resolveFeedbackValue<Args extends unknown[], Value>(
  value: Value | ((...args: Args) => Value) | undefined,
  args: Args,
): Value | undefined {
  return typeof value === "function"
    ? (value as (...args: Args) => Value)(...args)
    : value
}

export type AsyncFeedbackConfirmController = {
  open: (props: ConfirmProps) => Promise<boolean>
}

export type AsyncFeedbackToastController = {
  show: (input: ToastInput) => string
  update?: (id: string, patch: Partial<Omit<ToastInput, "id">>) => void
  dismiss?: (id: string) => void
}

type AsyncFeedbackMessages<Args extends unknown[], Value> = {
  toast?: AsyncFeedbackToastController
  loading?: ToastInput | ((...args: Args) => ToastInput | undefined)
  success?: ToastInput | ((value: Value, ...args: Args) => ToastInput | undefined)
  error?: ToastInput | ((error: unknown, ...args: Args) => ToastInput | undefined)
  throwOnError?: boolean
}

export type AsyncFeedbackOptions<Args extends unknown[] = unknown[], Value = unknown> =
  AsyncFeedbackMessages<Args, Value> & (
    | {
        confirm?: undefined
        confirmProps?: undefined
      }
    | {
        confirm: AsyncFeedbackConfirmController
        confirmProps: ConfirmProps | ((...args: Args) => ConfirmProps)
      }
  )

export type AsyncFeedbackResult<Value> =
  | {
      status: "success"
      value: Value
    }
  | {
      status: "cancelled"
    }
  | {
      status: "error"
      error: unknown
    }

export type AsyncFeedbackHooks<Args extends unknown[], Value> = {
  pending: boolean
  result: AsyncFeedbackResult<Value> | undefined
  error: unknown
  run: (...args: Args) => Promise<AsyncFeedbackResult<Value>>
  reset: () => void
}
