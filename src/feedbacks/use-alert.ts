import { useCallback, useRef, useState } from "react"

export function useAlert(): AlertHooks {
  const [props, setProps] = useState<AlertProps>({} as AlertProps)
  const [show, setShow] = useState<boolean>(false)
  const refOnClose = useRef<DialogOnClose | undefined>(undefined)

  const open = useCallback((props: AlertProps): void => {
    setShow(true)
    setProps(props)
    refOnClose.current = props.onClose
  }, [])

  const close = useCallback((): void => {
    setShow(false)
    refOnClose.current?.()
  }, [])

  return { show, props, open, close }
}

export type AlertProps = {
  title: string
  description: string
  onClose?: () => void
}

export type AlertHooks = {
  show: boolean
  props: AlertProps
  open: (props: AlertProps) => void
  close: () => void
}

type DialogOnClose = () => void
