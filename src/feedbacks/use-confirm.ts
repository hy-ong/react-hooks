import { useCallback, useRef, useState } from "react"

export function useConfirm(): ConfirmHooks {
  const [props, setProps] = useState<ConfirmProps>({} as ConfirmProps)
  const [show, setShow] = useState<boolean>(false)
  const refOnGrant = useRef<DialogOnGrant | undefined>(undefined)
  const refOnDeny = useRef<DialogOnDeny | undefined>(undefined)

  const open = useCallback((props: ConfirmProps): void => {
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

export type ConfirmProps = {
  title: string
  description: string
  grantText?: string
  denyText?: string
  onGrant?: () => void
  onDeny?: () => void
}

export type ConfirmHooks = {
  show: boolean
  props: ConfirmProps
  open: (props: ConfirmProps) => void
  grant: () => void
  deny: () => void
}

type DialogOnGrant = () => void
type DialogOnDeny = () => void
