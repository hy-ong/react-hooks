import { useCallback, useRef, useState } from "react"

export function useDialog<DialogProps = any, DialogResponse = any>(): DialogHooks<DialogProps, DialogResponse> {
  const [props, setProps] = useState<DialogProps>(() => ({}) as DialogProps)
  const [show, setShow] = useState<boolean>(false)
  const refResponse = useRef<DialogResponse | undefined>(undefined)
  const refOnClose = useRef<DialogOnClose<DialogResponse> | undefined>(undefined)
  const refOnCancel = useRef<DialogOnCancel | undefined>(undefined)

  const open = useCallback((props: DialogProps, callbackClose?: DialogOnClose<DialogResponse>, callbackCancel?: DialogOnCancel): void => {
    setShow(true)
    setProps(props)
    refOnClose.current = callbackClose
    refOnCancel.current = callbackCancel
  }, [])

  const close = useCallback((response?: DialogResponse): void => {
    setShow(false)
    refResponse.current = response
    if (refOnClose.current) {
      refOnClose.current(response as DialogResponse)
    }
  }, [])

  const cancel = useCallback((): void => {
    setShow(false)
    if (refOnCancel.current) {
      refOnCancel.current()
    }
  }, [])

  return { show, props, response: refResponse.current, open, close, cancel }
}

export type DialogHooks<DialogProps = any, DialogResponse = any> = {
  show: boolean
  props: DialogProps
  response: DialogResponse | undefined
  open: (props: DialogProps, callbackClose?: DialogOnClose<DialogResponse>, callbackCancel?: DialogOnCancel) => void
  close: (response?: DialogResponse) => void
  cancel: () => void
}

export type DialogOnClose<DialogResponse> = (response: DialogResponse) => void
export type DialogOnCancel = () => void
