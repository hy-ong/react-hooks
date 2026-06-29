import { act, renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import {
  useAlert,
  useAsyncFeedback,
  useConfirm,
  useConfirmAction,
  useDialog,
  useFeedbackQueue,
  usePrompt,
  useToast,
  useUndoToast,
} from "../src"

describe("useDialog", () => {
  it("stores falsy props and clears props when closed", () => {
    const { result } = renderHook(() => useDialog<number, string>())

    expect(result.current.show).toBe(false)
    expect(result.current.props).toBeUndefined()

    act(() => {
      result.current.open(0)
    })

    expect(result.current.show).toBe(true)
    expect(result.current.props).toBe(0)

    act(() => {
      result.current.close("done")
    })

    expect(result.current.show).toBe(false)
    expect(result.current.props).toBeUndefined()
    expect(result.current.response).toBe("done")
  })

  it("clears the previous response when opened or cancelled", () => {
    const { result } = renderHook(() => useDialog<string, string>())

    act(() => {
      result.current.open("first")
      result.current.close("accepted")
    })

    expect(result.current.response).toBe("accepted")

    act(() => {
      result.current.open("second")
    })

    expect(result.current.show).toBe(true)
    expect(result.current.props).toBe("second")
    expect(result.current.response).toBeUndefined()

    act(() => {
      result.current.cancel()
    })

    expect(result.current.show).toBe(false)
    expect(result.current.props).toBeUndefined()
    expect(result.current.response).toBeUndefined()
  })

  it("settles close or cancel callbacks only once per open", () => {
    const onClose = vi.fn()
    const onCancel = vi.fn()
    const { result } = renderHook(() => useDialog<string, string>())

    act(() => {
      result.current.open("confirm", onClose, onCancel)
      result.current.close("yes")
      result.current.close("again")
      result.current.cancel()
    })

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledWith("yes")
    expect(onCancel).not.toHaveBeenCalled()
  })

  it("resolves each dialog session with a close or cancel result", async () => {
    const { result } = renderHook(() => useDialog<{ title: string }, string>())
    let closePromise!: ReturnType<typeof result.current.open>
    let cancelPromise!: ReturnType<typeof result.current.open>

    act(() => {
      closePromise = result.current.open({ title: "Edit item" })
    })

    expect(result.current.show).toBe(true)
    expect(result.current.props?.title).toBe("Edit item")

    act(() => {
      result.current.close("saved")
    })

    await expect(closePromise).resolves.toEqual({ status: "closed", value: "saved" })

    act(() => {
      cancelPromise = result.current.open({ title: "Delete item" })
    })

    act(() => {
      result.current.cancel()
    })

    await expect(cancelPromise).resolves.toEqual({ status: "cancelled", reason: "cancelled" })
  })

  it("cancels the active session when replaced or unmounted", async () => {
    const { result, unmount } = renderHook(() => useDialog<string, string>())
    let firstPromise!: ReturnType<typeof result.current.open>
    let secondPromise!: ReturnType<typeof result.current.open>
    let unmountedPromise!: ReturnType<typeof result.current.open>

    act(() => {
      firstPromise = result.current.open("first")
    })

    act(() => {
      secondPromise = result.current.open("second")
    })

    expect(result.current.show).toBe(true)
    expect(result.current.props).toBe("second")
    await expect(firstPromise).resolves.toEqual({ status: "cancelled", reason: "replaced" })

    act(() => {
      result.current.close("accepted")
    })

    await expect(secondPromise).resolves.toEqual({ status: "closed", value: "accepted" })

    act(() => {
      unmountedPromise = result.current.open("third")
    })

    unmount()

    await expect(unmountedPromise).resolves.toEqual({ status: "cancelled", reason: "unmounted" })
  })

  it("can ignore new open attempts while a session is active", async () => {
    const { result } = renderHook(() => useDialog<string, string>({ replace: "ignore" }))
    let firstPromise!: ReturnType<typeof result.current.open>
    let ignoredPromise!: ReturnType<typeof result.current.open>

    act(() => {
      firstPromise = result.current.open("first")
    })

    act(() => {
      ignoredPromise = result.current.open("second")
    })

    expect(result.current.show).toBe(true)
    expect(result.current.props).toBe("first")
    await expect(ignoredPromise).resolves.toEqual({ status: "cancelled", reason: "ignored" })

    act(() => {
      result.current.close("accepted")
    })

    await expect(firstPromise).resolves.toEqual({ status: "closed", value: "accepted" })
  })
})

describe("useAlert", () => {
  it("clears props when closed and calls onClose only once", () => {
    const onClose = vi.fn()
    const { result } = renderHook(() => useAlert())

    expect(result.current.show).toBe(false)
    expect(result.current.props).toBeUndefined()

    act(() => {
      result.current.open({
        title: "Saved",
        description: "Changes were saved.",
        onClose,
      })
    })

    expect(result.current.show).toBe(true)
    expect(result.current.props?.title).toBe("Saved")

    act(() => {
      result.current.close()
      result.current.close()
    })

    expect(result.current.show).toBe(false)
    expect(result.current.props).toBeUndefined()
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("returns a promise that resolves when the alert is acknowledged", async () => {
    const { result } = renderHook(() => useAlert())
    let alertPromise!: ReturnType<typeof result.current.open>

    act(() => {
      alertPromise = result.current.open({
        title: "Saved",
        description: "Changes were saved.",
      })
    })

    expect(result.current.show).toBe(true)

    act(() => {
      result.current.close()
    })

    await expect(alertPromise).resolves.toBeUndefined()
  })

  it("keeps alert severity as feedback semantics", () => {
    const { result } = renderHook(() => useAlert())

    act(() => {
      result.current.open({
        title: "Saved",
        description: "Changes were saved.",
        severity: "success",
      })
    })

    expect(result.current.props?.severity).toBe("success")
  })
})

describe("useConfirm", () => {
  it("clears props when settled and calls only the first selected action", () => {
    const onGrant = vi.fn()
    const onDeny = vi.fn()
    const { result } = renderHook(() => useConfirm())

    expect(result.current.show).toBe(false)
    expect(result.current.props).toBeUndefined()

    act(() => {
      result.current.open({
        title: "Delete item",
        description: "This cannot be undone.",
        onGrant,
        onDeny,
      })
    })

    expect(result.current.show).toBe(true)
    expect(result.current.props?.title).toBe("Delete item")

    act(() => {
      result.current.grant()
      result.current.grant()
      result.current.deny()
    })

    expect(result.current.show).toBe(false)
    expect(result.current.props).toBeUndefined()
    expect(onGrant).toHaveBeenCalledTimes(1)
    expect(onDeny).not.toHaveBeenCalled()
  })

  it("returns true when granted and false when denied", async () => {
    const { result } = renderHook(() => useConfirm())
    let grantPromise!: ReturnType<typeof result.current.open>
    let denyPromise!: ReturnType<typeof result.current.open>

    act(() => {
      grantPromise = result.current.open({
        title: "Archive item",
        description: "Move this item to archive?",
      })
    })

    act(() => {
      result.current.grant()
    })

    await expect(grantPromise).resolves.toBe(true)

    act(() => {
      denyPromise = result.current.open({
        title: "Delete item",
        description: "This cannot be undone.",
      })
    })

    act(() => {
      result.current.deny()
    })

    await expect(denyPromise).resolves.toBe(false)
  })

  it("keeps confirm severity as feedback semantics", () => {
    const { result } = renderHook(() => useConfirm())

    act(() => {
      result.current.open({
        title: "Delete item",
        description: "This cannot be undone.",
        severity: "danger",
      })
    })

    expect(result.current.props?.severity).toBe("danger")
  })
})

describe("usePrompt", () => {
  it("tracks input state, validates submissions, and resolves submitted values", async () => {
    const { result } = renderHook(() => usePrompt<string>())
    let promptPromise!: ReturnType<typeof result.current.open>

    act(() => {
      promptPromise = result.current.open({
        title: "Rename item",
        defaultValue: "Ada",
        validate: (value) => value.trim() ? undefined : "Name is required",
      })
    })

    expect(result.current.show).toBe(true)
    expect(result.current.value).toBe("Ada")

    act(() => {
      result.current.setValue("")
    })

    await act(async () => {
      await expect(result.current.submit()).resolves.toBe(false)
    })

    expect(result.current.error).toBe("Name is required")

    act(() => {
      result.current.setValue("Grace")
    })

    await act(async () => {
      await expect(result.current.submit()).resolves.toBe(true)
    })

    await expect(promptPromise).resolves.toEqual({ status: "submitted", value: "Grace" })
    expect(result.current.show).toBe(false)
    expect(result.current.value).toBeUndefined()
  })

  it("resolves cancelled when dismissed", async () => {
    const { result } = renderHook(() => usePrompt<string>())
    let promptPromise!: ReturnType<typeof result.current.open>

    act(() => {
      promptPromise = result.current.open({ title: "Rename item", defaultValue: "Ada" })
    })

    act(() => {
      result.current.cancel()
    })

    await expect(promptPromise).resolves.toEqual({ status: "cancelled", reason: "cancelled" })
  })

  it("supports async validation, validating state, and value transform", async () => {
    const { result } = renderHook(() => usePrompt<string>())
    let promptPromise!: ReturnType<typeof result.current.open>

    act(() => {
      promptPromise = result.current.open({
        title: "Rename item",
        defaultValue: " Ada ",
        transform: (value) => value.trim(),
        validate: async (value) => value ? undefined : "Name is required",
      })
    })

    expect(result.current.validating).toBe(false)

    act(() => {
      result.current.setValue("   ")
    })

    let failedSubmit!: Promise<boolean>
    act(() => {
      failedSubmit = result.current.submit()
    })

    expect(result.current.validating).toBe(true)

    await act(async () => {
      await expect(failedSubmit).resolves.toBe(false)
    })

    expect(result.current.validating).toBe(false)
    expect(result.current.error).toBe("Name is required")

    act(() => {
      result.current.setValue(" Grace ")
    })

    await act(async () => {
      await expect(result.current.submit()).resolves.toBe(true)
    })

    await expect(promptPromise).resolves.toEqual({ status: "submitted", value: "Grace" })
  })

  it("ignores validation results after the prompt is cancelled", async () => {
    let resolveValidation!: (message?: string) => void
    const { result } = renderHook(() => usePrompt<string>())
    let promptPromise!: ReturnType<typeof result.current.open>
    let submitPromise!: Promise<boolean>

    act(() => {
      promptPromise = result.current.open({
        title: "Rename item",
        defaultValue: "Ada",
        validate: () => new Promise((resolve) => {
          resolveValidation = resolve
        }),
      })
    })

    act(() => {
      submitPromise = result.current.submit("Grace")
    })

    expect(result.current.validating).toBe(true)

    act(() => {
      result.current.cancel()
    })

    await act(async () => {
      resolveValidation()
      await submitPromise
    })

    await expect(submitPromise).resolves.toBe(false)
    await expect(promptPromise).resolves.toEqual({ status: "cancelled", reason: "cancelled" })
    expect(result.current.show).toBe(false)
    expect(result.current.value).toBeUndefined()
    expect(result.current.error).toBeUndefined()
    expect(result.current.validating).toBe(false)
  })
})

describe("useToast", () => {
  it("adds, replaces, auto-dismisses, and clears toast items", () => {
    vi.useFakeTimers()
    const { result, unmount } = renderHook(() => useToast({ defaultDuration: 1000 }))

    let firstId = ""

    act(() => {
      firstId = result.current.show({ title: "Saved" })
    })

    expect(result.current.items).toEqual([{ id: firstId, title: "Saved", duration: 1000 }])

    act(() => {
      result.current.show({ id: firstId, title: "Updated", duration: 2000 })
    })

    expect(result.current.items).toEqual([{ id: firstId, title: "Updated", duration: 2000 }])

    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(result.current.items).toHaveLength(1)

    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(result.current.items).toHaveLength(0)

    act(() => {
      result.current.show({ title: "One", duration: 0 })
      result.current.show({ title: "Two", duration: 0 })
    })

    expect(result.current.items).toHaveLength(2)

    act(() => {
      result.current.clear()
    })

    expect(result.current.items).toHaveLength(0)
    unmount()
    vi.useRealTimers()
  })

  it("updates toast items and exposes severity helpers", () => {
    const { result } = renderHook(() => useToast())
    let successId = ""
    let errorId = ""

    act(() => {
      successId = result.current.success({ title: "Saved", duration: 0 })
      errorId = result.current.error({ title: "Failed", duration: 0 })
    })

    expect(result.current.items).toEqual([
      { id: successId, title: "Saved", duration: 0, variant: "success" },
      { id: errorId, title: "Failed", duration: 0, variant: "error" },
    ])

    act(() => {
      result.current.update(successId, {
        title: "Saved again",
        description: "The item was updated.",
      })
    })

    expect(result.current.items[0]).toEqual({
      id: successId,
      title: "Saved again",
      description: "The item was updated.",
      duration: 0,
      variant: "success",
    })
  })
})

describe("useFeedbackQueue", () => {
  it("runs feedback tasks one at a time", async () => {
    const { result } = renderHook(() => useFeedbackQueue())
    let releaseFirst!: (value: string) => void
    const firstTask = vi.fn(() => new Promise<string>((resolve) => {
      releaseFirst = resolve
    }))
    const secondTask = vi.fn(() => "second")
    let firstPromise!: ReturnType<typeof result.current.enqueue>
    let secondPromise!: ReturnType<typeof result.current.enqueue>

    act(() => {
      firstPromise = result.current.enqueue(firstTask)
      secondPromise = result.current.enqueue(secondTask)
    })

    expect(firstTask).toHaveBeenCalledTimes(1)
    expect(secondTask).not.toHaveBeenCalled()
    expect(result.current.running).toBe(true)
    expect(result.current.pending).toBe(1)

    await act(async () => {
      releaseFirst("first")
      await firstPromise
    })

    await expect(firstPromise).resolves.toBe("first")
    await expect(secondPromise).resolves.toBe("second")
    expect(secondTask).toHaveBeenCalledTimes(1)
    expect(result.current.running).toBe(false)
    expect(result.current.pending).toBe(0)
  })

  it("clears pending feedback tasks without interrupting the running task", async () => {
    const { result } = renderHook(() => useFeedbackQueue())
    let releaseFirst!: (value: string) => void
    const firstTask = vi.fn(() => new Promise<string>((resolve) => {
      releaseFirst = resolve
    }))
    const secondTask = vi.fn(() => "second")
    let firstPromise!: ReturnType<typeof result.current.enqueue>
    let secondPromise!: ReturnType<typeof result.current.enqueue>

    act(() => {
      firstPromise = result.current.enqueue(firstTask)
      secondPromise = result.current.enqueue(secondTask)
    })

    act(() => {
      result.current.clear("skipped")
    })

    expect(result.current.running).toBe(true)
    expect(result.current.pending).toBe(0)
    await expect(secondPromise).rejects.toBe("skipped")
    expect(secondTask).not.toHaveBeenCalled()

    await act(async () => {
      releaseFirst("first")
      await firstPromise
    })

    await expect(firstPromise).resolves.toBe("first")
    expect(result.current.running).toBe(false)
  })
})

describe("useConfirmAction", () => {
  it("runs the action only after confirmation", async () => {
    const action = vi.fn(async (id: number) => `deleted-${id}`)
    const confirm = { open: vi.fn(async () => true) }
    const { result } = renderHook(() => useConfirmAction(action, confirm, (id: number) => ({
      title: "Delete item",
      description: `Delete item ${id}?`,
    })))

    await expect(result.current.run(7)).resolves.toEqual({ status: "confirmed", value: "deleted-7" })

    expect(confirm.open).toHaveBeenCalledWith({
      title: "Delete item",
      description: "Delete item 7?",
    })
    expect(action).toHaveBeenCalledWith(7)
  })

  it("skips the action when confirmation is denied", async () => {
    const action = vi.fn(async () => "deleted")
    const confirm = { open: vi.fn(async () => false) }
    const { result } = renderHook(() => useConfirmAction(action, confirm, {
      title: "Delete item",
      description: "This cannot be undone.",
    }))

    await expect(result.current.run()).resolves.toEqual({ status: "cancelled" })
    expect(action).not.toHaveBeenCalled()
  })
})

describe("useAsyncFeedback", () => {
  it("confirms before running and sends success feedback", async () => {
    const action = vi.fn(async (id: number) => `saved-${id}`)
    const confirm = { open: vi.fn(async () => true) }
    const toast = { show: vi.fn() }
    const { result } = renderHook(() => useAsyncFeedback(action, {
      confirm,
      toast,
      confirmProps: (id: number) => ({
        title: "Save item",
        description: `Save item ${id}?`,
      }),
      success: (value, id) => ({
        title: "Saved",
        description: `${value}:${id}`,
      }),
    }))

    let runResult!: Awaited<ReturnType<typeof result.current.run>>

    await act(async () => {
      runResult = await result.current.run(7)
    })

    expect(runResult).toEqual({ status: "success", value: "saved-7" })

    expect(confirm.open).toHaveBeenCalledWith({
      title: "Save item",
      description: "Save item 7?",
    })
    expect(action).toHaveBeenCalledWith(7)
    expect(toast.show).toHaveBeenCalledWith({
      title: "Saved",
      description: "saved-7:7",
      variant: "success",
    })
    expect(result.current.pending).toBe(false)
    expect(result.current.result).toEqual({ status: "success", value: "saved-7" })
  })

  it("skips the action when confirmation is denied", async () => {
    const action = vi.fn(async () => "saved")
    const confirm = { open: vi.fn(async () => false) }
    const { result } = renderHook(() => useAsyncFeedback(action, {
      confirm,
      confirmProps: {
        title: "Save item",
        description: "Save this item?",
      },
    }))

    let runResult!: Awaited<ReturnType<typeof result.current.run>>

    await act(async () => {
      runResult = await result.current.run()
    })

    expect(runResult).toEqual({ status: "cancelled" })
    expect(action).not.toHaveBeenCalled()
    expect(result.current.result).toEqual({ status: "cancelled" })
  })

  it("captures errors and sends error feedback", async () => {
    const error = new Error("Network failed")
    const action = vi.fn(async () => {
      throw error
    })
    const toast = { show: vi.fn() }
    const { result } = renderHook(() => useAsyncFeedback(action, {
      toast,
      error: (caught) => ({
        title: "Save failed",
        description: caught instanceof Error ? caught.message : "Unknown error",
      }),
    }))

    let runResult!: Awaited<ReturnType<typeof result.current.run>>

    await act(async () => {
      runResult = await result.current.run()
    })

    expect(runResult).toEqual({ status: "error", error })

    expect(toast.show).toHaveBeenCalledWith({
      title: "Save failed",
      description: "Network failed",
      variant: "error",
    })
    expect(result.current.error).toBe(error)
    expect(result.current.pending).toBe(false)
  })

  it("updates loading feedback through success", async () => {
    let resolveAction!: (value: string) => void
    const action = vi.fn(() => new Promise<string>((resolve) => {
      resolveAction = resolve
    }))
    const toast = {
      show: vi.fn(() => "loading-toast"),
      update: vi.fn(),
      dismiss: vi.fn(),
    }
    const { result } = renderHook(() => useAsyncFeedback(action, {
      toast,
      loading: { title: "Saving" },
      success: (value) => ({ title: "Saved", description: value }),
    }))

    let runPromise!: ReturnType<typeof result.current.run>

    act(() => {
      runPromise = result.current.run()
    })

    expect(result.current.pending).toBe(true)
    expect(toast.show).toHaveBeenCalledWith({
      title: "Saving",
      variant: "info",
    })

    await act(async () => {
      resolveAction("saved")
      await runPromise
    })

    expect(toast.update).toHaveBeenCalledWith("loading-toast", {
      title: "Saved",
      description: "saved",
      variant: "success",
    })
    await expect(runPromise).resolves.toEqual({ status: "success", value: "saved" })
  })

  it("can rethrow action errors after recording error feedback", async () => {
    const error = new Error("Network failed")
    const action = vi.fn(async () => {
      throw error
    })
    const { result } = renderHook(() => useAsyncFeedback(action, { throwOnError: true }))

    await act(async () => {
      await expect(result.current.run()).rejects.toBe(error)
    })

    expect(result.current.result).toEqual({ status: "error", error })
    expect(result.current.error).toBe(error)
  })

  it("keeps pending true until all concurrent runs settle", async () => {
    let resolveFirst!: (value: string) => void
    let resolveSecond!: (value: string) => void
    const action = vi.fn()
      .mockImplementationOnce(() => new Promise<string>((resolve) => {
        resolveFirst = resolve
      }))
      .mockImplementationOnce(() => new Promise<string>((resolve) => {
        resolveSecond = resolve
      }))
    const { result } = renderHook(() => useAsyncFeedback(action))
    let firstRun!: ReturnType<typeof result.current.run>
    let secondRun!: ReturnType<typeof result.current.run>

    act(() => {
      firstRun = result.current.run()
      secondRun = result.current.run()
    })

    expect(result.current.pending).toBe(true)

    await act(async () => {
      resolveFirst("first")
      await firstRun
    })

    expect(result.current.pending).toBe(true)

    await act(async () => {
      resolveSecond("second")
      await secondRun
    })

    expect(result.current.pending).toBe(false)
    await expect(firstRun).resolves.toEqual({ status: "success", value: "first" })
    await expect(secondRun).resolves.toEqual({ status: "success", value: "second" })
  })
})

describe("useUndoToast", () => {
  it("undoes before timeout and prevents finalize", async () => {
    vi.useFakeTimers()
    const toast = { show: vi.fn(() => "undo-toast"), dismiss: vi.fn() }
    const undo = vi.fn(async () => undefined)
    const finalize = vi.fn(async () => undefined)
    const { result, unmount } = renderHook(() => useUndoToast(toast))
    let undoable!: ReturnType<typeof result.current.show>

    act(() => {
      undoable = result.current.show({
        title: "Archived",
        duration: 1000,
        undo,
        finalize,
      })
    })

    expect(toast.show).toHaveBeenCalledWith({
      title: "Archived",
      duration: 1000,
      action: {
        label: "Undo",
        onClick: expect.any(Function),
      },
    })

    await act(async () => {
      await undoable.undo()
    })

    expect(undo).toHaveBeenCalledTimes(1)
    expect(toast.dismiss).toHaveBeenCalledWith("undo-toast")

    await act(async () => {
      vi.advanceTimersByTime(1000)
    })

    await expect(undoable.done).resolves.toEqual({ status: "undone" })
    expect(finalize).not.toHaveBeenCalled()

    unmount()
    vi.useRealTimers()
  })

  it("finalizes after timeout when not undone", async () => {
    vi.useFakeTimers()
    const toast = { show: vi.fn(() => "undo-toast"), dismiss: vi.fn() }
    const undo = vi.fn(async () => undefined)
    const finalize = vi.fn(async () => undefined)
    const { result, unmount } = renderHook(() => useUndoToast(toast))
    let undoable!: ReturnType<typeof result.current.show>

    act(() => {
      undoable = result.current.show({
        title: "Archived",
        duration: 1000,
        undo,
        finalize,
      })
    })

    await act(async () => {
      vi.advanceTimersByTime(1000)
    })

    await expect(undoable.done).resolves.toEqual({ status: "finalized" })
    expect(finalize).toHaveBeenCalledTimes(1)
    expect(undo).not.toHaveBeenCalled()

    unmount()
    vi.useRealTimers()
  })

  it("settles failed when undo rejects", async () => {
    vi.useFakeTimers()
    const error = new Error("Restore failed")
    const toast = { show: vi.fn(() => "undo-toast"), dismiss: vi.fn() }
    const { result, unmount } = renderHook(() => useUndoToast(toast))
    let undoable!: ReturnType<typeof result.current.show>

    act(() => {
      undoable = result.current.show({
        title: "Archived",
        duration: 1000,
        undo: async () => {
          throw error
        },
      })
    })

    await act(async () => {
      await undoable.undo()
    })

    await expect(undoable.done).resolves.toEqual({ status: "failed", phase: "undo", error })
    expect(result.current.pending).toBe(0)
    expect(toast.dismiss).toHaveBeenCalledWith("undo-toast")

    unmount()
    vi.useRealTimers()
  })

  it("settles failed when finalize rejects", async () => {
    vi.useFakeTimers()
    const error = new Error("Archive failed")
    const toast = { show: vi.fn(() => "undo-toast"), dismiss: vi.fn() }
    const { result, unmount } = renderHook(() => useUndoToast(toast))
    let undoable!: ReturnType<typeof result.current.show>

    act(() => {
      undoable = result.current.show({
        title: "Archived",
        duration: 1000,
        undo: vi.fn(),
        finalize: async () => {
          throw error
        },
      })
    })

    await act(async () => {
      vi.advanceTimersByTime(1000)
    })

    await expect(undoable.done).resolves.toEqual({ status: "failed", phase: "finalize", error })
    expect(result.current.pending).toBe(0)

    unmount()
    vi.useRealTimers()
  })

  it("tracks pending undo sessions and can cancel one", async () => {
    vi.useFakeTimers()
    const toast = { show: vi.fn(() => "undo-toast"), dismiss: vi.fn() }
    const finalize = vi.fn(async () => undefined)
    const { result, unmount } = renderHook(() => useUndoToast(toast))
    let undoable!: ReturnType<typeof result.current.show>

    act(() => {
      undoable = result.current.show({
        title: "Archived",
        duration: 1000,
        undo: vi.fn(),
        finalize,
      })
    })

    expect(result.current.pending).toBe(1)

    act(() => {
      result.current.cancel(undoable.id)
    })

    await expect(undoable.done).resolves.toEqual({ status: "dismissed" })
    expect(result.current.pending).toBe(0)
    expect(toast.dismiss).toHaveBeenCalledWith("undo-toast")
    expect(finalize).not.toHaveBeenCalled()

    unmount()
    vi.useRealTimers()
  })
})
