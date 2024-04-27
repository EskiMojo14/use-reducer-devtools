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

  // function actions - will be logged but cannot time-travel debug
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
        <p>
          <code>reduxCount</code> is {reduxCount.value}
        </p>
        <button onClick={() => dispatch(increment())}>Increment</button>
        <button onClick={() => dispatch(decrement())}>Decrement</button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <div className="card">
        <p>
          <code>sumCount</code> is {sumCount}
        </p>
        <button onClick={() => increaseCount(10)}>Increase by 10</button>
        <button onClick={() => increaseCount(-5)}>Decrease by 5</button>
      </div>
      <div className="card">
        <p>
          <code>settableCount</code> is {settableCount}
        </p>
        <button onClick={() => setCount(10)}>Set to 10</button>
        <button onClick={() => setCount((state) => state + 5)}>
          Increase by 5
        </button>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  );
}

export default App;
