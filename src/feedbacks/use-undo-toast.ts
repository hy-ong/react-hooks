import { useCallback, useEffect, useRef, useState } from "react"

import { ToastInput } from "./use-toast"

export function useUndoToast(toast: UndoToastController): UndoToastHooks {
  const sessionsRef = useRef<Map<string, UndoToastSession> | null>(null)
  const [pending, setPending] = useState(0)

  if (sessionsRef.current === null) {
    sessionsRef.current = new Map()
  }
  const sessions = sessionsRef.current

  const settle = useCallback((id: string, result: UndoToastResult): void => {
    const session = sessions.get(id)
    if (!session) return

    sessions.delete(id)
    clearTimeout(session.timer)
    setPending(sessions.size)
    session.resolve(result)
  }, [sessions])

  const undo = useCallback(async (id: string, input: UndoToastInput): Promise<void> => {
    const session = sessions.get(id)
    if (!session || session.settling) return

    session.settling = true

    try {
      await input.undo()
      toast.dismiss(id)
      settle(id, { status: "undone" })
    } catch (error) {
      toast.dismiss(id)
      settle(id, { status: "failed", phase: "undo", error })
    }
  }, [sessions, settle, toast])

  const show = useCallback((input: UndoToastInput): UndoToastHandle => {
    let toastId = ""
    const done = new Promise<UndoToastResult>((resolve) => {
      toastId = toast.show({
        title: input.title,
        description: input.description,
        variant: input.variant,
        duration: input.duration,
        action: {
          label: input.undoLabel ?? "Undo",
          onClick: () => {
            void undo(toastId, input)
          },
        },
      })

      const timer = setTimeout(() => {
        const session = sessions.get(toastId)
        if (!session || session.settling) return

        session.settling = true
        Promise.resolve(input.finalize?.())
          .then(
            () => {
              settle(toastId, { status: "finalized" })
            },
            (error: unknown) => {
              settle(toastId, { status: "failed", phase: "finalize", error })
            },
          )
      }, input.duration)

      sessions.set(toastId, { resolve, timer })
      setPending(sessions.size)
    })

    return {
      id: toastId,
      done,
      undo: () => undo(toastId, input),
    }
  }, [sessions, settle, toast, undo])

  const cancel = useCallback((id: string): void => {
    const session = sessions.get(id)
    if (!session) return

    toast.dismiss(id)
    settle(id, { status: "dismissed" })
  }, [sessions, settle, toast])

  const clear = useCallback((): void => {
    sessions.forEach((session) => {
      clearTimeout(session.timer)
      session.resolve({ status: "dismissed" })
    })
    sessions.clear()
    setPending(0)
  }, [sessions])

  useEffect(() => clear, [clear])

  return { pending, show, cancel, clear }
}

type UndoToastSession = {
  resolve: (result: UndoToastResult) => void
  timer: ReturnType<typeof setTimeout>
  settling?: boolean
}

export type UndoToastController = {
  show: (input: ToastInput) => string
  dismiss: (id: string) => void
}

export type UndoToastInput = {
  title: string
  description?: string
  variant?: ToastInput["variant"]
  duration: number
  undoLabel?: string
  undo: () => void | Promise<void>
  finalize?: () => void | Promise<void>
}

export type UndoToastResult =
  | {
      status: "undone"
    }
  | {
      status: "finalized"
    }
  | {
      status: "dismissed"
    }
  | {
      status: "failed"
      phase: "undo" | "finalize"
      error: unknown
    }

export type UndoToastHandle = {
  id: string
  done: Promise<UndoToastResult>
  undo: () => Promise<void>
}

export type UndoToastHooks = {
  pending: number
  show: (input: UndoToastInput) => UndoToastHandle
  cancel: (id: string) => void
  clear: () => void
}
