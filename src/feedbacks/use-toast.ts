import { useCallback, useEffect, useRef, useState } from "react"

export function useToast(options: ToastOptions = {}): ToastHooks {
  const [items, setItems] = useState<ToastItem[]>([])
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>> | null>(null)
  const nextIdRef = useRef(0)

  if (timersRef.current === null) {
    timersRef.current = new Map()
  }
  const timers = timersRef.current

  const clearTimer = useCallback((id: string): void => {
    const timer = timers.get(id)
    if (!timer) return

    clearTimeout(timer)
    timers.delete(id)
  }, [timers])

  const dismiss = useCallback((id: string): void => {
    clearTimer(id)
    setItems((current) => current.filter((item) => item.id !== id))
  }, [clearTimer])

  const scheduleDismiss = useCallback((item: ToastItem): void => {
    clearTimer(item.id)

    if (!item.duration || item.duration <= 0) return

    const timer = setTimeout(() => {
      dismiss(item.id)
    }, item.duration)
    timers.set(item.id, timer)
  }, [clearTimer, dismiss, timers])

  const show = useCallback((input: ToastInput): string => {
    const id = input.id ?? `toast-${nextIdRef.current += 1}`
    const item: ToastItem = {
      ...input,
      id,
      duration: input.duration ?? options.defaultDuration,
    }

    setItems((current) => {
      const index = current.findIndex((currentItem) => currentItem.id === id)
      if (index === -1) return [...current, item]

      const next = [...current]
      next[index] = item
      return next
    })
    scheduleDismiss(item)

    return id
  }, [options.defaultDuration, scheduleDismiss])

  const update = useCallback((id: string, patch: ToastUpdate): void => {
    setItems((current) => {
      const index = current.findIndex((item) => item.id === id)
      if (index === -1) return current

      const item = {
        ...current[index],
        ...patch,
        id,
      }
      const next = [...current]
      next[index] = item
      scheduleDismiss(item)
      return next
    })
  }, [scheduleDismiss])

  const showWithVariant = useCallback((variant: ToastVariant, input: ToastVariantInput): string => {
    return show({ ...input, variant })
  }, [show])

  const success = useCallback((input: ToastVariantInput): string => {
    return showWithVariant("success", input)
  }, [showWithVariant])

  const error = useCallback((input: ToastVariantInput): string => {
    return showWithVariant("error", input)
  }, [showWithVariant])

  const warning = useCallback((input: ToastVariantInput): string => {
    return showWithVariant("warning", input)
  }, [showWithVariant])

  const info = useCallback((input: ToastVariantInput): string => {
    return showWithVariant("info", input)
  }, [showWithVariant])

  const clear = useCallback((): void => {
    timers.forEach((timer) => {
      clearTimeout(timer)
    })
    timers.clear()
    setItems([])
  }, [timers])

  useEffect(() => clear, [clear])

  return { items, show, update, success, error, warning, info, dismiss, clear }
}

export type ToastOptions = {
  defaultDuration?: number
}

export type ToastVariant = "default" | "success" | "warning" | "error" | "info"

export type ToastInput = {
  id?: string
  title: string
  description?: string
  variant?: ToastVariant
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

export type ToastVariantInput = Omit<ToastInput, "variant">
export type ToastUpdate = Partial<Omit<ToastInput, "id">>

export type ToastItem = ToastInput & {
  id: string
  duration?: number
}

export type ToastHooks = {
  items: ToastItem[]
  show: (input: ToastInput) => string
  update: (id: string, patch: ToastUpdate) => void
  success: (input: ToastVariantInput) => string
  error: (input: ToastVariantInput) => string
  warning: (input: ToastVariantInput) => string
  info: (input: ToastVariantInput) => string
  dismiss: (id: string) => void
  clear: () => void
}
