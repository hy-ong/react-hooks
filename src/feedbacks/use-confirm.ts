import { useCallback } from "react"

import { FeedbackSeverity } from "./use-alert"
import { useDialog } from "./use-dialog"

export function useConfirm(): ConfirmHooks {
  const { show, props, open: openDialog, close } = useDialog<ConfirmProps, boolean>()

  const open = useCallback((props: ConfirmProps): Promise<boolean> => {
    return openDialog(props, {
      onClose: (granted) => {
        if (granted) {
          props.onGrant?.()
        } else {
          props.onDeny?.()
        }
      },
      onCancel: () => {
        props.onDeny?.()
      },
    }).then((result) => result.status === "closed" ? result.value : false)
  }, [openDialog])

  const grant = useCallback((): void => {
    close(true)
  }, [close])

  const deny = useCallback((): void => {
    close(false)
  }, [close])

  if (show) {
    return { show: true, props, open, grant, deny }
  }

  return { show: false, props: undefined, open, grant, deny }
}

export type ConfirmProps = {
  title: string
  description: string
  severity?: FeedbackSeverity
  grantText?: string
  denyText?: string
  onGrant?: () => void
  onDeny?: () => void
}

export type ConfirmHooks = {
  open: (props: ConfirmProps) => Promise<boolean>
  grant: () => void
  deny: () => void
} & (
  | {
      show: true
      props: ConfirmProps
    }
  | {
      show: false
      props: undefined
    }
)
