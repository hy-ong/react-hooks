import { useCallback, useRef, useState } from "react"

import { DialogCancelReason, useDialog } from "./use-dialog"

export function usePrompt<Value = string>(): PromptHooks<Value> {
  const { show, props, open: openDialog, close, cancel: cancelDialog } = useDialog<PromptProps<Value>, Value>()
  const [value, setValue] = useState<Value | undefined>(undefined)
  const [error, setError] = useState<string | undefined>(undefined)
  const [validating, setValidating] = useState(false)
  const sessionRef = useRef(0)
  const submissionRef = useRef(0)

  const open = useCallback((props: PromptProps<Value>): Promise<PromptResult<Value>> => {
    sessionRef.current += 1
    submissionRef.current += 1
    setValue(props.defaultValue)
    setError(undefined)
    setValidating(false)

    return openDialog(props).then((result) => {
      if (result.status === "closed") {
        return { status: "submitted", value: result.value }
      }

      return { status: "cancelled", reason: result.reason }
    })
  }, [openDialog])

  const submit = useCallback(async (nextValue?: Value): Promise<boolean> => {
    if (!show || !props) return false

    const session = sessionRef.current
    const submission = submissionRef.current + 1
    submissionRef.current = submission
    const rawValue = nextValue ?? value
    const submittedValue = props.transform
      ? props.transform(rawValue as Value)
      : rawValue as Value

    setValidating(true)
    let message: string | undefined

    try {
      message = await props.validate?.(submittedValue)
    } catch (error) {
      if (sessionRef.current === session && submissionRef.current === submission) {
        setValidating(false)
      }
      throw error
    }

    if (sessionRef.current !== session || submissionRef.current !== submission) {
      return false
    }

    setValidating(false)

    if (message) {
      setError(message)
      return false
    }

    setError(undefined)
    setValue(undefined)
    submissionRef.current += 1
    close(submittedValue as Value)
    return true
  }, [close, props, show, value])

  const cancel = useCallback((): void => {
    sessionRef.current += 1
    submissionRef.current += 1
    setError(undefined)
    setValidating(false)
    setValue(undefined)
    cancelDialog()
  }, [cancelDialog])

  if (show) {
    return { show: true, props, value, error, validating, open, setValue, submit, cancel }
  }

  return { show: false, props: undefined, value: undefined, error: undefined, validating: false, open, setValue, submit, cancel }
}

export type PromptProps<Value = string> = {
  title: string
  description?: string
  defaultValue: Value
  placeholder?: string
  transform?: (value: Value) => Value
  validate?: (value: Value) => string | undefined | Promise<string | undefined>
}

export type PromptResult<Value = string> =
  | {
      status: "submitted"
      value: Value
    }
  | {
      status: "cancelled"
      reason: DialogCancelReason
    }

export type PromptHooks<Value = string> = {
  value: Value | undefined
  error: string | undefined
  validating: boolean
  open: (props: PromptProps<Value>) => Promise<PromptResult<Value>>
  setValue: (value: Value) => void
  submit: (value?: Value) => Promise<boolean>
  cancel: () => void
} & (
  | {
      show: true
      props: PromptProps<Value>
    }
  | {
      show: false
      props: undefined
    }
)
