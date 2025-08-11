# @hy_ong/react-hooks

A collection of useful React hooks.

## Installation

```bash
npm install @hy_ong/react-hooks
```

## Hooks

### useDialog

A hook for managing dialog state with support for props, responses, and callbacks.

```tsx
import { useDialog } from '@hy_ong/react-hooks'

function MyComponent() {
  const dialog = useDialog<{ title: string }, { confirmed: boolean }>()

  const handleOpenDialog = () => {
    dialog.open(
      { title: 'Confirm Action' },
      (response) => console.log('Closed with:', response),
      () => console.log('Cancelled')
    )
  }

  return (
    <>
      <button onClick={handleOpenDialog}>Open Dialog</button>
      {dialog.show && (
        <div>
          <h2>{dialog.props.title}</h2>
          <button onClick={() => dialog.close({ confirmed: true })}>
            Confirm
          </button>
          <button onClick={() => dialog.cancel()}>
            Cancel
          </button>
        </div>
      )}
    </>
  )
}
```

#### API

- `show: boolean` - Whether the dialog is currently visible
- `props: DialogProps` - Properties passed to the dialog
- `response: DialogResponse | undefined` - The last response from the dialog
- `open(props, onClose?, onCancel?)` - Opens the dialog with given props and optional callbacks
- `close(response?)` - Closes the dialog with an optional response
- `cancel()` - Cancels the dialog without a response

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