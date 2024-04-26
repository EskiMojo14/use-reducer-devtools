import type { LiftedState } from "@redux-devtools/instrument";
import type { Action, UseReducerActions } from "./actions";

export type NotUndefined = NonNullable<unknown> | null;

export type ConnectResponse = ReturnType<
  NonNullable<Window["__REDUX_DEVTOOLS_EXTENSION__"]>["connect"]
>;

export interface ActionState<S, A extends Action> {
  state: S;
  actions: Array<
    | [A | Action<typeof UseReducerActions.INIT>, S]
    | [Action<typeof UseReducerActions.NULL>, LiftedState<S, A, unknown>]
  >;
}

export interface StatusRefs {
  paused: boolean;
  locked: boolean;
  subscribed: boolean;
}
