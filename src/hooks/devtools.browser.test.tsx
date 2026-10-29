import { describe, expect, it, vi } from "vite-plus/test";
import { render } from "vitest-browser-react";

import { ActionTypes, MessageTypes, ensureAction } from "../actions";
import { useReducerWithProdDevtools } from "../index";
import type { DevtoolsConfig } from "../types";

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

interface RichState {
  date: Date;
  values: Map<string, number>;
}

function reviveDate(key: string, value: unknown): unknown {
  return key === "date" && typeof value === "string" ? new Date(value) : value;
}

function RichCounter({
  serialize = true,
}: {
  serialize?: DevtoolsConfig<RichState, number>["serialize"];
}) {
  const [state] = useReducerWithProdDevtools(
    (current: RichState, amount: number) => ({
      ...current,
      values: new Map([["count", (current.values.get("count") ?? 0) + amount]]),
    }),
    () => ({ date: new Date("2026-01-01T00:00:00Z"), values: new Map([["count", 0]]) }),
    { serialize },
  );
  return (
    <output aria-label="Rich state">
      {state.date instanceof Date ? state.date.toISOString() : "Invalid date"}:
      {state.values instanceof Map ? state.values.get("count") : "Invalid map"}
    </output>
  );
}

function ImmutableCounter() {
  const [state] = useReducerWithProdDevtools(
    (current: Immutable.Map<string, number>, amount: number) =>
      current.update("count", 0, (count) => count + amount),
    () => Immutable.Map({ count: 0 }),
    { serialize: { immutable: Immutable } },
  );
  return (
    <output aria-label="Immutable state">
      {Immutable.Map.isMap(state) ? state.get("count") : "Invalid immutable state"}
    </output>
  );
}

describe("useReducerWithProdDevtools in a browser", () => {
  it.each([ActionTypes.JUMP_TO_STATE, ActionTypes.JUMP_TO_ACTION, ActionTypes.ROLLBACK])(
    "restores Dates and Maps for %s",
    async (type) => {
      using devtools = installDevtools();
      const screen = await render(<RichCounter />);
      devtools.receive({
        type: MessageTypes.DISPATCH,
        payload: { type },
        state: jsan.stringify(
          { date: new Date("2026-10-29T00:00:00Z"), values: new Map([["count", 42]]) },
          undefined,
          undefined,
          true,
        ),
      });

      await expect
        .element(screen.getByRole("status", { name: "Rich state" }))
        .toHaveTextContent("2026-10-29T00:00:00.000Z:42");
    },
  );

  it("uses the configured reviver for time travel", async () => {
    using devtools = installDevtools();
    const screen = await render(<RichCounter serialize={{ reviver: reviveDate }} />);
    devtools.receive({
      type: MessageTypes.DISPATCH,
      payload: { type: ActionTypes.JUMP_TO_STATE },
      state: jsan.stringify(
        { date: "2026-10-29T00:00:00Z", values: new Map([["count", 42]]) },
        undefined,
        undefined,
        true,
      ),
    });

    await expect
      .element(screen.getByRole("status", { name: "Rich state" }))
      .toHaveTextContent("2026-10-29T00:00:00.000Z:42");
  });

  it("restores Immutable state for time travel", async () => {
    using devtools = installDevtools();
    const screen = await render(<ImmutableCounter />);
    const serializer = immutableSerialize(Immutable);
    devtools.receive({
      type: MessageTypes.DISPATCH,
      payload: { type: ActionTypes.JUMP_TO_STATE },
      state: jsan.stringify(
        Immutable.Map({ count: 42 }),
        serializer.replacer,
        undefined,
        serializer.options,
      ),
    });

    await expect
      .element(screen.getByRole("status", { name: "Immutable state" }))
      .toHaveTextContent("42");
  });

  it("deserializes lifted history before replaying a skipped action", async () => {
    using devtools = installDevtools();
    const screen = await render(<RichCounter serialize={{ reviver: reviveDate }} />);
    const initial = { date: new Date("2026-10-29T00:00:00Z"), values: new Map([["count", 40]]) };
    const serializedInitial = { ...initial, date: initial.date.toISOString() };
    devtools.receive({
      type: MessageTypes.DISPATCH,
      payload: { type: ActionTypes.TOGGLE_ACTION, id: 1 },
      state: jsan.stringify(
        {
          stagedActionIds: [0, 1],
          skippedActionIds: [1],
          actionsById: { 1: { action: ensureAction(2) } },
          computedStates: [{ state: serializedInitial }, { state: serializedInitial }],
        },
        undefined,
        undefined,
        true,
      ),
    });

    await expect
      .element(screen.getByRole("status", { name: "Rich state" }))
      .toHaveTextContent("2026-10-29T00:00:00.000Z:42");
    await expect
      .poll(() => devtools.connection.send.mock.calls.at(-1))
      .toEqual([
        null,
        expect.objectContaining({
          skippedActionIds: [],
          computedStates: [
            { state: initial },
            { state: { ...initial, values: new Map([["count", 42]]) } },
          ],
        }),
      ]);
  });

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
import { immutableSerialize } from "@redux-devtools/serialize";
import * as Immutable from "immutable";
import jsan from "jsan";
