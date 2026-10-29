import { describe, expect, it, vi } from "vite-plus/test";
import { render } from "vitest-browser-react";

import { ActionTypes, MessageTypes } from "../actions";
import { useReducerWithProdDevtools } from "../index";

type DevtoolsMessageHandler = (message: unknown) => void;

function installDevtools() {
  let messageHandler: DevtoolsMessageHandler | undefined;
  const connection = {
    init: vi.fn(),
    send: vi.fn(),
    subscribe: vi.fn((listener: DevtoolsMessageHandler) => {
      messageHandler = listener;
      return vi.fn();
    }),
  };
  const connect = vi.fn(() => connection);

  vi.stubGlobal("__REDUX_DEVTOOLS_EXTENSION__", { connect });

  return {
    connect,
    connection,
    receive(message: unknown) {
      if (!messageHandler) {
        throw new Error("DevTools listener has not been registered");
      }
      messageHandler(message);
    },
  };
}

function Counter() {
  const [count, dispatch] = useReducerWithProdDevtools(
    (state: number, action: { type: "increment" }) =>
      action.type === "increment" ? state + 1 : state,
    0,
    { name: "browser-test-counter" },
  );

  return <button onClick={() => dispatch({ type: "increment" })}>Count is {count}</button>;
}

describe("useReducerWithProdDevtools in a browser", () => {
  it("initializes DevTools and sends reducer actions with the resulting state", async () => {
    const devtools = installDevtools();
    const screen = await render(<Counter />);

    expect(devtools.connect).toHaveBeenCalledOnce();
    expect(devtools.connection.init).toHaveBeenCalledWith(0);

    await screen.getByRole("button", { name: "Count is 0" }).click();

    await expect.element(screen.getByRole("button", { name: "Count is 1" })).toBeVisible();
    expect(devtools.connection.send).toHaveBeenCalledWith({ type: "increment" }, 1);
  });

  it("applies a DevTools jump-to-state message", async () => {
    const devtools = installDevtools();
    const screen = await render(<Counter />);

    devtools.receive({
      type: MessageTypes.DISPATCH,
      payload: { type: ActionTypes.JUMP_TO_STATE },
      state: JSON.stringify(42),
    });

    await expect.element(screen.getByRole("button", { name: "Count is 42" })).toBeVisible();
  });
});
