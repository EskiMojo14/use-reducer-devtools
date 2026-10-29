import { describe, expect, it, vi } from "vite-plus/test";
import { render } from "vitest-browser-react";

import { ActionTypes, MessageTypes, ensureAction } from "../actions";
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
    [Symbol.dispose]() {
      vi.unstubAllGlobals();
    },
    receive(message: unknown) {
      if (!messageHandler) {
        throw new Error("DevTools listener has not been registered");
      }
      messageHandler(message);
    },
  };
}

function Counter({ initialState = 0 }: { initialState?: number }) {
  const [count, dispatch] = useReducerWithProdDevtools(
    (state: number, action: { type: "increment" }) =>
      action.type === "increment" ? state + 1 : state,
    initialState,
    { name: "browser-test-counter" },
  );

  return <button onClick={() => dispatch({ type: "increment" })}>Count is {count}</button>;
}

function Digits() {
  const [value] = useReducerWithProdDevtools(
    (state: number, digit: number) => state * 10 + digit,
    0,
  );
  return <output aria-label="Digits">{value}</output>;
}

describe("useReducerWithProdDevtools in a browser", () => {
  it("initializes DevTools and sends reducer actions with the resulting state", async () => {
    using devtools = installDevtools();
    const screen = await render(<Counter />);

    expect(devtools.connect).toHaveBeenCalledOnce();
    expect(devtools.connection.init).toHaveBeenCalledWith(0);

    await screen.getByRole("button", { name: "Count is 0" }).click();

    await expect.element(screen.getByRole("button", { name: "Count is 1" })).toBeVisible();
    expect(devtools.connection.send).toHaveBeenCalledWith({ type: "increment" }, 1);
  });

  it("applies a DevTools jump-to-state message", async () => {
    using devtools = installDevtools();
    const screen = await render(<Counter />);

    devtools.receive({
      type: MessageTypes.DISPATCH,
      payload: { type: ActionTypes.JUMP_TO_STATE },
      state: JSON.stringify(42),
    });

    await expect.element(screen.getByRole("button", { name: "Count is 42" })).toBeVisible();
  });

  it("replays imported actions and sends their resulting history to DevTools", async () => {
    using devtools = installDevtools();
    const screen = await render(<Counter />);
    devtools.connection.init.mockClear();

    devtools.receive({
      type: MessageTypes.DISPATCH,
      payload: {
        type: ActionTypes.IMPORT_STATE,
        preloadedState: 40,
        nextLiftedState: [{ type: "increment" }, { type: "increment" }],
      },
    });

    await expect.element(screen.getByRole("button", { name: "Count is 42" })).toBeVisible();
    await expect.poll(() => devtools.connection.init.mock.calls).toEqual([[40]]);
    expect(devtools.connection.send.mock.calls).toEqual([
      [{ type: "increment" }, 41],
      [{ type: "increment" }, 42],
    ]);

    await screen.getByRole("button", { name: "Count is 42" }).click();
    await expect.element(screen.getByRole("button", { name: "Count is 43" })).toBeVisible();
  });

  it("starts imported actions from the hook's initial state when preloadedState is absent", async () => {
    using devtools = installDevtools();
    const screen = await render(<Counter initialState={10} />);
    await screen.getByRole("button", { name: "Count is 10" }).click();
    devtools.connection.init.mockClear();
    devtools.connection.send.mockClear();

    devtools.receive({
      type: MessageTypes.DISPATCH,
      payload: {
        type: ActionTypes.IMPORT_STATE,
        nextLiftedState: [{ type: "increment" }],
      },
    });

    await expect.element(screen.getByRole("button", { name: "Count is 11" })).toBeVisible();
    await expect.poll(() => devtools.connection.init.mock.calls).toEqual([[10]]);
    expect(devtools.connection.send).toHaveBeenCalledExactlyOnceWith({ type: "increment" }, 11);
  });

  it("imports an empty action history with a zero preloaded state", async () => {
    using devtools = installDevtools();
    const screen = await render(<Counter initialState={10} />);
    devtools.connection.init.mockClear();

    devtools.receive({
      type: MessageTypes.DISPATCH,
      payload: {
        type: ActionTypes.IMPORT_STATE,
        preloadedState: 0,
        nextLiftedState: [],
      },
    });

    await expect.element(screen.getByRole("button", { name: "Count is 0" })).toBeVisible();
    await expect.poll(() => devtools.connection.init.mock.calls).toEqual([[0]]);
    expect(devtools.connection.send).not.toHaveBeenCalled();
  });

  it("unwraps non-Redux actions when replaying an imported history", async () => {
    using devtools = installDevtools();
    const screen = await render(<Digits />);
    devtools.connection.init.mockClear();

    devtools.receive({
      type: MessageTypes.DISPATCH,
      payload: {
        type: ActionTypes.IMPORT_STATE,
        nextLiftedState: [ensureAction(2), ensureAction(3)],
      },
    });

    await expect.element(screen.getByRole("status", { name: "Digits" })).toHaveTextContent("23");
    await expect.poll(() => devtools.connection.init.mock.calls).toEqual([[0]]);
    expect(devtools.connection.send.mock.calls).toEqual([
      [ensureAction(2), 2],
      [ensureAction(3), 23],
    ]);
  });
});
