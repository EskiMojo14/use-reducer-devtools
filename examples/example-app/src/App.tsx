import { createSlice } from "@reduxjs/toolkit";
import { useReducerWithDevtools } from "use-reducer-devtools";

import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";
import { SetStateAction } from "react";

const counterSlice = createSlice({
  name: "counter",
  initialState: { value: 0 },
  reducers: {
    increment(state) {
      state.value += 1;
    },
    decrement(state) {
      state.value -= 1;
    },
  },
  extraReducers(builder) {
    builder.addCase("custom!", (state) => {
      state.value += 10;
    });
  },
});

const { increment, decrement } = counterSlice.actions;

function App() {
  // redux-style actions
  const [count, dispatch] = useReducerWithDevtools(
    counterSlice.reducer,
    counterSlice.getInitialState,
    { actionCreators: counterSlice.actions },
  );

  // custom actions - in this case, just a number
  const [countUp, increaseBy] = useReducerWithDevtools(
    (state: number, action: number) => state + action,
    0,
    { actionCreators: { increaseBy: (amount: number) => amount } },
  );

  const [hidden, setHidden] = useReducerWithDevtools(
    (state: boolean, action: SetStateAction<boolean>) =>
      typeof action === "function" ? action(state) : action,
    false,
    {
      actionCreators: {
        setHidden: (hidden: boolean) => hidden,
        toggleHidden: () => (prev: boolean) => !prev,
      },
    },
  );

  return (
    <>
      <div>
        <a href="https://vitejs.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <p>count is {count.value}</p>
        <button onClick={() => dispatch(increment())}>Increment</button>
        <button onClick={() => dispatch(decrement())}>Decrement</button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <div className="card">
        <p>countUp is {countUp}</p>
        <button onClick={() => increaseBy(10)}>Increase by 10</button>
        <button onClick={() => increaseBy(-5)}>Decrease by 5</button>
      </div>
      <div className="card">
        <p>hidden is {hidden.toString()}</p>
        <button onClick={() => setHidden((prev) => !prev)}>Toggle</button>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  );
}

export default App;
