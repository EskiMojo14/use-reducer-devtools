import type { Config } from "@redux-devtools/extension";
import type { LiftedState } from "@redux-devtools/instrument";
import type { Action, EnsureAction, UseReducerActions } from "./actions";

type ActionCreator<A> = (...args: Array<any>) => A;

export type DevtoolsConfig<S, A> = Config & {
  actionCreators?: Array<ActionCreator<A>> | Record<string, ActionCreator<A>>;
  instanceId?: number;
};

export type NotUndefined = NonNullable<unknown> | null;

export type ConnectResponse = ReturnType<
  NonNullable<Window["__REDUX_DEVTOOLS_EXTENSION__"]>["connect"]
>;

export interface ActionState<S, A> {
  state: S;
  actions: Array<
    | [A | Action<typeof UseReducerActions.INIT>, S]
    | [
        Action<typeof UseReducerActions.NULL>,
        LiftedState<S, EnsureAction<A>, unknown>,
      ]
  >;
}

export interface StatusRefs {
  paused: boolean;
  locked: boolean;
  subscribed: boolean;
}
