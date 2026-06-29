# @hy_ong/react-hooks

Headless feedback lifecycle hooks for React applications.

This package focuses on user feedback flows: dialogs, alerts, confirmations, prompts, toasts, and confirmed actions. It does not provide UI components. You bring your own dialog, modal, toast, or form components and wire them to these controllers.

## Installation

```bash
npm install @hy_ong/react-hooks
```

## Design

- Hooks are headless and UI-agnostic.
- Feedback actions are lifecycle-aware and single-shot.
- Dialog-style hooks support awaitable flows.
- Closed hooks do not expose stale props.
- Toasts are non-blocking and queue-friendly.

## useDialog

Generic primitive for a single active dialog session.

```typescript
import { useDialog } from "@hy_ong/react-hooks";

const dialog = useDialog<{ title: string }, string>();
const guardedDialog = useDialog({ replace: "ignore" });

async function askName() {
  const result = await dialog.open({ title: "Enter your name" });

  if (result.status === "closed") {
    console.log(result.value);
  }
}

dialog.close("Grace");
dialog.cancel();
```

**API:**

- `show: boolean` - Whether the dialog is visible.
- `props: DialogProps | undefined` - Current dialog props while visible.
- `response: DialogResponse | undefined` - Last close response.
- `result: DialogResult | undefined` - Last settled session result.
- `open(props, options?)` - Opens a new session and returns a promise.
- `close(response?)` - Settles the active session as closed.
- `cancel(reason?)` - Settles the active session as cancelled.
- `reset()` - Clears visible state and the last result.

Opening a new session cancels the previous active session with `reason: "replaced"`. Pass `useDialog({ replace: "ignore" })` to keep the active session and resolve the new open attempt with `reason: "ignored"`. Unmounting cancels the active session with `reason: "unmounted"`.

## useAlert

Acknowledgement flow for simple alert dialogs.

```typescript
import { useAlert } from "@hy_ong/react-hooks";

const alert = useAlert();

async function save() {
  await alert.open({
    title: "Saved",
    description: "Changes were saved.",
    severity: "success",
  });
}

alert.close();
```

**API:**

- `show: boolean`
- `props: AlertProps | undefined`
- `open(props): Promise<void>`
- `close()`
- `AlertProps.severity?: "info" | "success" | "warning" | "error" | "danger"`

## useConfirm

Boolean decision flow for confirmation dialogs.

```typescript
import { useConfirm } from "@hy_ong/react-hooks";

const confirm = useConfirm();

async function removeItem() {
  const granted = await confirm.open({
    title: "Delete item",
    description: "This cannot be undone.",
    severity: "danger",
    grantText: "Delete",
    denyText: "Cancel",
  });

  if (granted) {
    // delete item
  }
}

confirm.grant();
confirm.deny();
```

**API:**

- `show: boolean`
- `props: ConfirmProps | undefined`
- `open(props): Promise<boolean>`
- `grant()`
- `deny()`
- `ConfirmProps.severity?: "info" | "success" | "warning" | "error" | "danger"`

## usePrompt

Input flow for prompt-style dialogs.

```typescript
import { usePrompt } from "@hy_ong/react-hooks";

const prompt = usePrompt<string>();

async function renameItem() {
  const result = await prompt.open({
    title: "Rename item",
    defaultValue: "Untitled",
    transform: (value) => value.trim(),
    validate: async (value) => value ? undefined : "Name is required",
  });

  if (result.status === "submitted") {
    console.log(result.value);
  }
}

prompt.setValue("New name");
await prompt.submit();
prompt.cancel();
```

**API:**

- `show: boolean`
- `props: PromptProps | undefined`
- `value: Value | undefined`
- `error: string | undefined`
- `validating: boolean`
- `open(props): Promise<PromptResult<Value>>`
- `setValue(value)`
- `submit(value?): Promise<boolean>`
- `cancel()`

Async validation results are ignored when the prompt is cancelled or replaced before validation finishes.

## useToast

Non-blocking toast state with optional auto-dismiss.

```typescript
import { useToast } from "@hy_ong/react-hooks";

const toast = useToast({ defaultDuration: 3000 });

const id = toast.show({
  title: "Saved",
  variant: "success",
});

toast.update(id, { description: "Saved again." });
toast.success({ title: "Done" });
toast.error({ title: "Failed" });
toast.dismiss(id);
toast.clear();
```

**API:**

- `items: ToastItem[]`
- `show(input): string`
- `update(id, patch)`
- `success(input): string`
- `error(input): string`
- `warning(input): string`
- `info(input): string`
- `dismiss(id)`
- `clear()`

## useUndoToast

Recoverable toast flow for actions that can be undone before a timeout.

```typescript
import { useToast, useUndoToast } from "@hy_ong/react-hooks";

const toast = useToast();
const undoToast = useUndoToast(toast);

const archived = undoToast.show({
  title: "Item archived",
  duration: 5000,
  undo: () => restoreItem(),
  finalize: () => commitArchive(),
});

const result = await archived.done;
undoToast.cancel(archived.id);
```

**API:**

- `pending: number`
- `show(input): UndoToastHandle`
- `cancel(id)`
- `clear()`
- `UndoToastHandle.id: string`
- `UndoToastHandle.done: Promise<UndoToastResult>`
- `UndoToastHandle.undo()`

`UndoToastResult` resolves to `undone`, `finalized`, `dismissed`, or `failed`. Failed results include `phase: "undo" | "finalize"` and the original `error`.

## useFeedbackQueue

Runs feedback tasks sequentially.

```typescript
import { useFeedbackQueue } from "@hy_ong/react-hooks";

const queue = useFeedbackQueue();

await queue.enqueue(() => confirm.open({
  title: "Delete item",
  description: "This cannot be undone.",
}));
```

**API:**

- `running: boolean`
- `pending: number`
- `enqueue(task): Promise<Result>`
- `clear(reason?)`

## useAsyncFeedback

Wraps an async action with optional confirmation plus success/error feedback.

```typescript
import { useAsyncFeedback, useConfirm, useToast } from "@hy_ong/react-hooks";

const confirm = useConfirm();
const toast = useToast();
const save = useAsyncFeedback(saveItem, {
  confirm,
  toast,
  confirmProps: {
    title: "Save item",
    description: "Save these changes?",
  },
  loading: { title: "Saving..." },
  success: () => ({ title: "Saved" }),
  error: (error) => ({
    title: "Save failed",
    description: error instanceof Error ? error.message : "Unknown error",
  }),
  throwOnError: false,
});

const result = await save.run(item);
```

**API:**

- `pending: boolean` - True while one or more action runs are in flight.
- `result: AsyncFeedbackResult | undefined`
- `error: unknown`
- `run(...args): Promise<AsyncFeedbackResult>`
- `reset()`

## useConfirmAction

Wraps an action with a confirmation step.

```typescript
import { useConfirm, useConfirmAction } from "@hy_ong/react-hooks";

const confirm = useConfirm();
const remove = useConfirmAction(
  (id: string) => deleteItem(id),
  confirm,
  (id) => ({
    title: "Delete item",
    description: `Delete ${id}?`,
  }),
);

await remove.run("item-1");
```

**API:**

- `pending: boolean`
- `run(...args): Promise<ConfirmActionResult>`

## Rendering

Render your own UI from the hook state.

```tsx
{confirm.show && (
  <ConfirmDialog
    title={confirm.props.title}
    description={confirm.props.description}
    grantText={confirm.props.grantText}
    denyText={confirm.props.denyText}
    onGrant={confirm.grant}
    onDeny={confirm.deny}
  />
)}
```

The `show` flag narrows `props` to the active props type.

## Development

```bash
npm install
npm run check
npm run build
npm run release:dry-run
```

## License

MIT © [Ong Hoe Yuan](https://github.com/hy-ong)
