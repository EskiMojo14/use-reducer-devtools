# use-reducer-devtools

A `useReducer` wrapper that provides a Redux DevTools extension integration, including time travel debugging. Supports both Redux style and non-Redux style reducers.

By default this will only be enabled in development mode, and fall back to a simpler implementation in production. If you want to keep it enabled in production, import `useReducerWithProdDevtools` instead.

```ts
// redux-style actions
const [reduxCount, dispatch] = useReducerWithDevtools(
  counterSlice.reducer,
  counterSlice.getInitialState,
  { name: "Redux style count slice", actionCreators: counterSlice.actions },
);

// custom actions - in this case, just a number
const [sumCount, increaseCount] = useReducerWithDevtools(
  (state: number, action: number) => state + action,
  0,
  {
    name: "countUp reducer",
    actionCreators: { increaseCount: (amount: number) => amount },
  },
);

// function actions
const [settableCount, setCount] = useReducerWithDevtools(
  (state: number, action: SetStateAction<number>) =>
    typeof action === "function" ? action(state) : action,
  0,
  {
    name: "setState style reducer",
    actionCreators: {
      setCount: (amount: number) => amount,
      increaseCount: (amount: number) => (state: number) => state + amount,
    },
  },
);
```

## Arguments

- `reducer` - A reducer function of type `(state, action) => newState`
- `initialState` - The initial state of the reducer, or a function that returns the initial state.
- `options` (optional) - The config to pass to the DevTools extension. See [docs](https://github.com/reduxjs/redux-devtools/blob/main/extension/docs/API/Arguments.md) for more details.

For state containing Dates, Maps, Sets, or circular references, configure `serialize` to preserve those values when sending them to DevTools (for example, `{ serialize: true }`). Time travel, rollback, and action skipping decode the DevTools JSAN format and respect `serialize.reviver` and `serialize.immutable` settings. Values lost during serialization cannot be restored.

## Importing history

The DevTools import feature supports both full lifted histories and action-only histories. Action-only histories are replayed in order from their `preloadedState`, or from the hook's initial state when it is omitted. Importing an empty action array resets the state to that starting state. The replayed history is sent back to DevTools.

Full-history imports restore the selected time-travel position, rather than always selecting the latest state. Skipping or restoring an action recomputes subsequent history, including skipped entries, and preserves the selected position.

Locking changes blocks application dispatches and actions dispatched from the DevTools UI. DevTools controls such as time travel, reset, and import remain available while locked.

## Limitations

- Action reordering is not supported and is disabled by default. Redux DevTools does not include the action history in `REORDER_ACTION` messages for non-Redux connections, and this hook does not retain its own full history. Enabling `features.reorder` does not add support. Supporting reordering would require local history tracking or an upstream protocol change.
- Redux Devtools doesn't currently support disconnecting a store, meaning that each hook will still show in the DevTools even after the component is unmounted. This is a limitation of the DevTools extension itself, and not something that can be fixed in this library.
- For time travel debugging to work properly, your state must be serializable using the configured DevTools serializer (plain JSON by default). DevTools features that evaluate action text—including replaying function actions and dispatching actions from the DevTools UI—use `new Function` and require a Content Security Policy that allows `unsafe-eval`. Under a stricter policy, ordinary reducer dispatch still works, but those DevTools features will be blocked.
- Because of the way the `useReducerWithDevTools` hook logs committed actions, it will cause a rerender every time an action is dispatched, regardless of if your reducer returned a new state. This is different to the usual behaviour of `useReducer`, which only causes a rerender when the state changes. This should be less of an issue as the DevTools integration is only enabled in development mode by default.
