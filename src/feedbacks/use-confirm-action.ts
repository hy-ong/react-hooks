import { useCallback, useState } from "react"

import { ConfirmProps } from "./use-confirm"

export function useConfirmAction<Args extends unknown[], Value>(
  action: (...args: Args) => Value | Promise<Value>,
  confirm: ConfirmActionController,
  props: ConfirmProps | ((...args: Args) => ConfirmProps),
): ConfirmActionHooks<Args, Value> {
  const [pending, setPending] = useState(false)

  const run = useCallback(async (...args: Args): Promise<ConfirmActionResult<Value>> => {
    const confirmProps = typeof props === "function"
      ? (props as (...args: Args) => ConfirmProps)(...args)
      : props
    const granted = await confirm.open(confirmProps)

    if (!granted) {
      return { status: "cancelled" }
    }

    setPending(true)
    try {
      return { status: "confirmed", value: await action(...args) }
    } finally {
      setPending(false)
    }
  }, [action, confirm, props])

  return { pending, run }
}

export type ConfirmActionController = {
  open: (props: ConfirmProps) => Promise<boolean>
}

export type ConfirmActionResult<Value> =
  | {
      status: "confirmed"
      value: Value
    }
  | {
      status: "cancelled"
    }

export type ConfirmActionHooks<Args extends unknown[], Value> = {
  pending: boolean
  run: (...args: Args) => Promise<ConfirmActionResult<Value>>
}
