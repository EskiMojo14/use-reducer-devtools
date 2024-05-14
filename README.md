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

## Limitations

- Redux Devtools doesn't currently support disconnecting a store, meaning that each hook will still show in the DevTools even after the component is unmounted. This is a limitation of the DevTools extension itself, and not something that can be fixed in this library.
- For time travel debugging to work properly, your state must be serializeable (i.e. JSON.stringify-able). Actions can be functions, in which case they will be stringified and evaluated on replay.
- Because of the way the `useReducerWithDevTools` hook logs committed actions, it will cause a rerender every time an action is dispatched, regardless of if your reducer returned a new state. This is different to the usual behaviour of `useReducer`, which only causes a rerender when the state changes. This should be less of an issue as the DevTools integration is only enabled in development mode by default.
