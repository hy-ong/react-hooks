# @hy_ong/react-hooks

A collection of reusable React hooks for dialog management in modern React applications.

## Installation

```bash
npm install @hy_ong/react-hooks
```

## Hooks

### useDialog

A generic hook for managing modal dialogs with custom props and response handling.

```typescript
import { useDialog } from '@hy_ong/react-hooks';

// Basic usage
const dialog = useDialog<{ title: string }, string>();

// Open a dialog
dialog.open(
  { title: "Enter your name" },
  (response) => console.log("Response:", response),
  () => console.log("Cancelled")
);

// Close with response
dialog.close("John Doe");

// Cancel without response
dialog.cancel();
```

**API:**
- `show: boolean` - Whether the dialog is visible
- `props: DialogProps` - Current dialog props
- `response: DialogResponse | undefined` - Last response from dialog
- `open(props, onClose?, onCancel?)` - Open the dialog
- `close(response?)` - Close dialog with optional response
- `cancel()` - Cancel dialog without response

### useAlert

A specialized hook for simple alert dialogs with title and description.

```typescript
import { useAlert } from '@hy_ong/react-hooks';

const alert = useAlert();

// Open an alert
alert.open({
  title: "Success",
  description: "Operation completed successfully",
  onClose: () => console.log("Alert closed")
});

// Close the alert
alert.close();
```

**API:**
- `show: boolean` - Whether the alert is visible
- `props: AlertProps` - Current alert props
- `open(props)` - Open the alert
- `close()` - Close the alert

**AlertProps:**
- `title: string` - Alert title
- `description: string` - Alert description
- `onClose?: () => void` - Optional close callback

### useConfirm

A specialized hook for confirmation dialogs with grant/deny actions.

```typescript
import { useConfirm } from '@hy_ong/react-hooks';

const confirm = useConfirm();

// Open a confirmation dialog
confirm.open({
  title: "Delete Item",
  description: "Are you sure you want to delete this item?",
  grantText: "Delete",
  denyText: "Cancel",
  onGrant: () => console.log("Confirmed"),
  onDeny: () => console.log("Denied")
});

// Grant the confirmation
confirm.grant();

// Deny the confirmation
confirm.deny();
```

**API:**
- `show: boolean` - Whether the confirmation is visible
- `props: AlertProps` - Current confirmation props
- `open(props)` - Open the confirmation
- `grant()` - Grant/confirm the action
- `deny()` - Deny/cancel the action

**AlertProps:**
- `title: string` - Confirmation title
- `description: string` - Confirmation description
- `grantText?: string` - Text for grant/confirm button
- `denyText?: string` - Text for deny/cancel button
- `onGrant?: () => void` - Optional grant callback
- `onDeny?: () => void` - Optional deny callback

## Example Implementation

Here's how you might implement a dialog component using these hooks:

```typescript
import React from 'react';
import { useAlert, useConfirm, useDialog } from '@hy_ong/react-hooks';

function MyComponent() {
  const alert = useAlert();
  const confirm = useConfirm();
  const dialog = useDialog<{ message: string }, boolean>();

  return (
    <div>
      <button onClick={() => alert.open({
        title: "Info",
        description: "This is an information message"
      })}>
        Show Alert
      </button>

      <button onClick={() => confirm.open({
        title: "Confirm Action",
        description: "Do you want to proceed?",
        onGrant: () => console.log("User confirmed"),
        onDeny: () => console.log("User denied")
      })}>
        Show Confirmation
      </button>

      <button onClick={() => dialog.open(
        { message: "Custom dialog content" },
        (response) => console.log("Dialog response:", response)
      )}>
        Show Custom Dialog
      </button>

      {/* Render your dialog components based on the hook states */}
      {alert.show && (
        <AlertDialog
          title={alert.props.title}
          description={alert.props.description}
          onClose={alert.close}
        />
      )}

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

      {dialog.show && (
        <CustomDialog
          message={dialog.props.message}
          onClose={dialog.close}
          onCancel={dialog.cancel}
        />
      )}
    </div>
  );
}
```

## Features

- **TypeScript Support**: Full TypeScript support with generic types
- **Lightweight**: Minimal dependencies (only React)
- **Flexible**: Generic `useDialog` for custom implementations
- **Specialized**: Pre-built hooks for common use cases
- **Modern**: Built with React hooks and functional components

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build
npm run build
```

## License

MIT © [Ong Hoe Yuan](https://github.com/hy-ong)

## Repository

[GitHub Repository](https://github.com/hy-ong/react-hooks)

## Issues

Found a bug or have a feature request? [Create an issue](https://github.com/hy-ong/react-hooks/issues)