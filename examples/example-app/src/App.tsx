import { createSlice } from "@reduxjs/toolkit";
import { useReducerWithDevtools } from "use-reducer-devtools";

import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";

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
  const [count, dispatch] = useReducerWithDevtools(
    counterSlice.reducer,
    counterSlice.getInitialState,
    { actionCreators: counterSlice.actions },
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
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  );
}

export default App;
