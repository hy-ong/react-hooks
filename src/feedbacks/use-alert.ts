import { useCallback } from "react"

import { useDialog } from "./use-dialog"

export function useAlert(): AlertHooks {
  const { show, props, open: openDialog, close: closeDialog } = useDialog<AlertProps, undefined>()

  const open = useCallback((props: AlertProps): Promise<void> => {
    return openDialog(props, props.onClose).then(() => undefined)
  }, [openDialog])

  const close = useCallback((): void => {
    closeDialog()
  }, [closeDialog])

  if (show) {
    return { show: true, props, open, close }
  }

  return { show: false, props: undefined, open, close }
}

export type AlertProps = {
  title: string
  description: string
  severity?: FeedbackSeverity
  onClose?: () => void
}

export type FeedbackSeverity = "info" | "success" | "warning" | "error" | "danger"

export type AlertHooks = {
  open: (props: AlertProps) => Promise<void>
  close: () => void
} & (
  | {
      show: true
      props: AlertProps
    }
  | {
      show: false
      props: undefined
    }
)
