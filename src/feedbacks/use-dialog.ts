import { useCallback, useEffect, useRef, useState } from "react"

export function useDialog<
  DialogProps = undefined,
  DialogResponse = undefined,
  CancelReason extends string = DialogCancelReason,
>(dialogOptions: DialogOptions = {}): DialogHooks<DialogProps, DialogResponse, CancelReason> {
  const [state, setState] = useState<DialogState<DialogProps, DialogResponse, CancelReason>>({
    show: false,
    props: undefined,
    response: undefined,
    result: undefined,
  })
  const sessionRef = useRef<DialogSession<DialogResponse, CancelReason> | undefined>(undefined)

  const settle = useCallback((result: DialogResult<DialogResponse, CancelReason>, updateState = true): void => {
    const session = sessionRef.current
    if (!session) return

    sessionRef.current = undefined

    if (result.status === "closed") {
      session.onClose?.(result.value)
    } else {
      session.onCancel?.(result.reason)
    }

    if (updateState) {
      setState({
        show: false,
        props: undefined,
        response: result.status === "closed" ? result.value : undefined,
        result,
      })
    }

    session.resolve(result)
  }, [])

  const open = useCallback((
    props?: DialogProps,
    optionsOrOnClose?: DialogOpenOptions<DialogResponse, CancelReason> | DialogOnClose<DialogResponse>,
    callbackCancel?: DialogOnCancel<CancelReason>,
  ): Promise<DialogResult<DialogResponse, CancelReason>> => {
    if (sessionRef.current && dialogOptions.replace === "ignore") {
      return Promise.resolve({ status: "cancelled", reason: "ignored" as CancelReason })
    }

    settle({ status: "cancelled", reason: "replaced" as CancelReason })

    const options = typeof optionsOrOnClose === "function"
      ? { onClose: optionsOrOnClose, onCancel: callbackCancel }
      : optionsOrOnClose

    setState({
      show: true,
      props: props as DialogProps,
      response: undefined,
      result: undefined,
    })

    return new Promise((resolve) => {
      sessionRef.current = {
        resolve,
        onClose: options?.onClose,
        onCancel: options?.onCancel,
      }
    })
  }, [dialogOptions.replace, settle]) as DialogOpen<DialogProps, DialogResponse, CancelReason>

  const close = useCallback((response?: DialogResponse): void => {
    settle({ status: "closed", value: response as DialogResponse })
  }, [settle])

  const cancel = useCallback((reason: CancelReason = "cancelled" as CancelReason): void => {
    settle({ status: "cancelled", reason })
  }, [settle])

  const reset = useCallback((): void => {
    settle({ status: "cancelled", reason: "cancelled" as CancelReason })
    setState({ show: false, props: undefined, response: undefined, result: undefined })
  }, [settle])

  useEffect(() => () => {
    settle({ status: "cancelled", reason: "unmounted" as CancelReason }, false)
  }, [settle])

  if (state.show) {
    return {
      show: true,
      props: state.props,
      response: state.response,
      result: state.result,
      open,
      close,
      cancel,
      reset,
    }
  }

  return {
    show: false,
    props: undefined,
    response: state.response,
    result: state.result,
    open,
    close,
    cancel,
    reset,
  }
}

type DialogSession<DialogResponse, CancelReason extends string> = {
  resolve: (result: DialogResult<DialogResponse, CancelReason>) => void
  onClose?: DialogOnClose<DialogResponse>
  onCancel?: DialogOnCancel<CancelReason>
}

type DialogState<DialogProps, DialogResponse, CancelReason extends string> =
  | {
      show: true
      props: DialogProps
      response: DialogResponse | undefined
      result: DialogResult<DialogResponse, CancelReason> | undefined
    }
  | {
      show: false
      props: undefined
      response: DialogResponse | undefined
      result: DialogResult<DialogResponse, CancelReason> | undefined
    }

type DialogControls<DialogProps, DialogResponse, CancelReason extends string> = {
  response: DialogResponse | undefined
  result: DialogResult<DialogResponse, CancelReason> | undefined
  open: DialogOpen<DialogProps, DialogResponse, CancelReason>
  close: (response?: DialogResponse) => void
  cancel: (reason?: CancelReason) => void
  reset: () => void
}

export type DialogHooks<
  DialogProps = undefined,
  DialogResponse = undefined,
  CancelReason extends string = DialogCancelReason,
> =
  | (DialogControls<DialogProps, DialogResponse, CancelReason> & {
      show: true
      props: DialogProps
    })
  | (DialogControls<DialogProps, DialogResponse, CancelReason> & {
      show: false
      props: undefined
    })

export type DialogResult<DialogResponse = undefined, CancelReason extends string = DialogCancelReason> =
  | {
      status: "closed"
      value: DialogResponse
    }
  | {
      status: "cancelled"
      reason: CancelReason
    }

export type DialogOpen<DialogProps, DialogResponse, CancelReason extends string = DialogCancelReason> =
  undefined extends DialogProps
    ? (
        props?: DialogProps,
        optionsOrOnClose?: DialogOpenOptions<DialogResponse, CancelReason> | DialogOnClose<DialogResponse>,
        callbackCancel?: DialogOnCancel<CancelReason>,
      ) => Promise<DialogResult<DialogResponse, CancelReason>>
    : (
        props: DialogProps,
        optionsOrOnClose?: DialogOpenOptions<DialogResponse, CancelReason> | DialogOnClose<DialogResponse>,
        callbackCancel?: DialogOnCancel<CancelReason>,
      ) => Promise<DialogResult<DialogResponse, CancelReason>>

export type DialogOnClose<DialogResponse> = (response: DialogResponse | undefined) => void
export type DialogOnCancel<CancelReason extends string = DialogCancelReason> = (reason: CancelReason) => void
export type DialogOpenOptions<DialogResponse, CancelReason extends string = DialogCancelReason> = {
  onClose?: DialogOnClose<DialogResponse>
  onCancel?: DialogOnCancel<CancelReason>
}
export type DialogOptions = {
  replace?: "cancel" | "ignore"
}
export type DialogCancelReason = "cancelled" | "replaced" | "unmounted" | "ignored"
