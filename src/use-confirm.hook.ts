import { useCallback, useRef, useState } from "react"

function useConfirm(): ConfirmHooks {
  const [props, setProps] = useState<AlertProps>({} as AlertProps)
  const [show, setShow] = useState<boolean>(false)
  const refOnGrant = useRef<DialogOnGrant | undefined>(undefined)
  const refOnDeny = useRef<DialogOnDeny | undefined>(undefined)

  const open = useCallback((props: AlertProps): void => {
    setShow(true)
    setProps(props)
    refOnGrant.current = props.onGrant
    refOnDeny.current = props.onDeny
  }, [])

  const grant = useCallback((): void => {
    setShow(false)
    refOnGrant.current?.()
  }, [])

  const deny = useCallback((): void => {
    setShow(false)
    refOnDeny.current?.()
  }, [])

  return { show, props, open, grant, deny }
}

export type AlertProps = {
  title: string
  description: string
  grantText?: string
  denyText?: string
  onGrant?: () => void
  onDeny?: () => void
}

export type ConfirmHooks = {
  show: boolean
  props: AlertProps
  open: (props: AlertProps) => void
  grant: () => void
  deny: () => void
}

type DialogOnGrant = () => void
type DialogOnDeny = () => void

export default useConfirm
