import type { Config } from "@redux-devtools/extension";
import type {
  LiftedAction,
  LiftedState as DevtoolsLiftedState,
} from "@redux-devtools/instrument";
import { evalAction } from "@redux-devtools/utils";
import type { Reducer, Dispatch, MutableRefObject } from "react";
import { useEffect, useReducer, useRef } from "react";
import { processActionCreators, toggleAction as getToggledState } from "./util";

export interface Action<T extends string = string> {
  type: T;
}

// TODO: make actual connection
declare const devtools: any;

function isStateFunction<S>(state: S | (() => S)): state is () => S {
  return typeof state === "function";
}

const getInitialState = <S>(initialState: S | (() => S)): S =>
  isStateFunction(initialState) ? initialState() : initialState;

function useReducerWithLazyState<S, A extends Action>(
  reducer: Reducer<S, A>,
  initialState: S | (() => S),
): [S, Dispatch<A>] {
  return useReducer(reducer, 0, () => getInitialState(initialState));
}

const ActionTypes = {
  PERFORM_ACTION: "PERFORM_ACTION",
  RESET: "RESET",
  ROLLBACK: "ROLLBACK",
  COMMIT: "COMMIT",
  SWEEP: "SWEEP",
  TOGGLE_ACTION: "TOGGLE_ACTION",
  SET_ACTIONS_ACTIVE: "SET_ACTIONS_ACTIVE",
  JUMP_TO_STATE: "JUMP_TO_STATE",
  JUMP_TO_ACTION: "JUMP_TO_ACTION",
  REORDER_ACTION: "REORDER_ACTION",
  IMPORT_STATE: "IMPORT_STATE",
  LOCK_CHANGES: "LOCK_CHANGES",
  PAUSE_RECORDING: "PAUSE_RECORDING",
} as const;

const MessageTypes = {
  DISPATCH: "DISPATCH",
  ACTION: "ACTION",
  START: "START",
  STOP: "STOP",
} as const;

type PostMessage<S, A extends Action> =
  | {
      type: typeof MessageTypes.DISPATCH;
      payload: LiftedAction<S, A, unknown>;
      state: string;
    }
  | {
      type: typeof MessageTypes.ACTION;
      action: string;
    }
  | {
      type: typeof MessageTypes.START;
    }
  | {
      type: typeof MessageTypes.STOP;
    };

const prefix = "@@USE_REDUCER_WITH_DEVTOOLS";

const UseReducerActions = {
  /** A message received from the devtools connection */
  POST_MESSAGE: `${prefix}/POST_MESSAGE`,
  /** We should call .init */
  INIT: `${prefix}/INIT`,
  /** special case - send should be called with null */
  NULL: `${prefix}/NULL`,
} as const;

interface PostMessageAction<S, A extends Action> {
  type: typeof UseReducerActions.POST_MESSAGE;
  payload: PostMessage<S, A>;
}

function postMessage<S, A extends Action>(
  message: PostMessage<S, A>,
): PostMessageAction<S, A> {
  return {
    type: UseReducerActions.POST_MESSAGE,
    payload: message,
  };
}

postMessage.match = <S, A extends Action>(
  action: Action,
): action is PostMessageAction<S, A> =>
  action.type === UseReducerActions.POST_MESSAGE;

interface LiftedState<S, A extends Action> {
  state: S;
  actions: Array<
    | [A | Action<typeof UseReducerActions.INIT>, S]
    | [
        Action<typeof UseReducerActions.IMPORT_STATE>,
        DevtoolsLiftedState<S, A, unknown>,
      ]
  >;
}

const shouldInitState = <S, A extends Action>(state: S): LiftedState<S, A> => ({
  state,
  actions: [[{ type: UseReducerActions.INIT }, state]],
});

const clearActions = <S, A extends Action>(state: S): LiftedState<S, A> => ({
  state,
  actions: [],
});

const withAction = <S, A extends Action>(
  state: LiftedState<S, A>,
  action: A,
  nextState: S,
): LiftedState<S, A> => ({
  state: nextState,
  actions: [...state.actions, [action, nextState]],
});

const processAction = <S, A extends Action>(
  reducer: Reducer<S, A>,
  state: LiftedState<S, A>,
  action: A,
): LiftedState<S, A> => {
  const nextState = reducer(state.state, action);
  return withAction(state, action, nextState);
};

const toggleAction = <S, A extends Action>(
  reducer: Reducer<S, A>,
  state: LiftedState<S, A>,
  id: number,
  strState: string,
): LiftedState<S, A> => {
  const { nextState, liftedState } = getToggledState(
    reducer,
    state.state,
    id,
    strState,
  );

  return {
    state: nextState,
    actions: [
      ...state.actions,
      [{ type: UseReducerActions.NULL }, liftedState],
    ],
  };
};

const importState = <S, A extends Action>(
  state: LiftedState<S, A>,
  nextLiftedState: DevtoolsLiftedState<S, A, unknown>,
): LiftedState<S, A> => ({
  state: nextLiftedState.computedStates.slice(-1)[0]?.state ?? state.state,
  actions: [
    ...state.actions,
    [{ type: UseReducerActions.NULL }, nextLiftedState],
  ],
});

const messageReducer = <S, A extends Action>(
  state: LiftedState<S, A>,
  message: PostMessage<S, A>,
  reducer: Reducer<S, A>,
  initialState: S | (() => S),
  config: Config,
): LiftedState<S, A> => {
  switch (message.type) {
    case MessageTypes.DISPATCH: {
      switch (message.payload.type) {
        case ActionTypes.RESET: {
          const state = getInitialState(initialState);
          return shouldInitState(state);
        }
        case ActionTypes.COMMIT: {
          return shouldInitState(state.state);
        }
        case ActionTypes.ROLLBACK: {
          return clearActions(JSON.parse(message.state) as S);
        }
        case ActionTypes.JUMP_TO_STATE:
        case ActionTypes.JUMP_TO_ACTION: {
          return clearActions(JSON.parse(message.state) as S);
        }
        case ActionTypes.TOGGLE_ACTION: {
          return toggleAction(
            reducer,
            state,
            message.payload.id,
            message.state,
          );
        }
        case ActionTypes.IMPORT_STATE: {
          const { nextLiftedState } = message.payload;
          if ("computedStates" in nextLiftedState) {
            return importState(state, nextLiftedState);
          }
          // TODO: legacy format? not sure what to do with that
          return state;
        }
        default:
          return state;
      }
    }
    case MessageTypes.ACTION: {
      const action = evalAction(
        message.action,
        processActionCreators(config.actionCreators),
      ) as A;
      return processAction(reducer, state, action);
    }
    default:
      return state;
  }
};

const liftReducer =
  <S, A extends Action>(
    reducer: Reducer<S, A>,
    initialState: S | (() => S),
    config: Config,
    recordingRef: MutableRefObject<boolean>,
    lockedRef: MutableRefObject<boolean>,
  ): Reducer<LiftedState<S, A>, A | PostMessageAction<S, A>> =>
  (state, action) => {
    if (lockedRef.current) return state;

    if (postMessage.match<S, A>(action)) {
      return messageReducer(
        state,
        action.payload,
        reducer,
        initialState,
        config,
      );
    }

    if (!recordingRef.current) {
      return {
        state: reducer(state.state, action),
        actions: state.actions,
      };
    }

    return processAction(reducer, state, action);
  };

function useReducerWithDevtoolsImpl<S, A extends Action>(
  reducer: Reducer<S, A>,
  initialState: S | (() => S),
  config: Config = {},
): [S, Dispatch<A>] {
  const recordingRef = useRef(config.shouldRecordChanges ?? true);
  const lockedRef = useRef(config.shouldStartLocked ?? false);

  const [{ state, actions }, dispatch] = useReducerWithLazyState(
    liftReducer(reducer, initialState, config, recordingRef, lockedRef),
    (): LiftedState<S, A> => ({
      state: getInitialState(initialState),
      actions: [],
    }),
  );

  useEffect(() => {
    let entry = actions.shift();
    while (entry) {
      const [action, state] = entry;
      switch (action.type) {
        case UseReducerActions.INIT:
          devtools.init(state);
          break;
        case UseReducerActions.NULL:
          devtools.send(null, state);
          break;
        default:
          devtools.send(action, state);
          break;
      }
      entry = actions.shift();
    }
  }, [actions]);

  useEffect(
    () =>
      devtools.subscribe((message: PostMessage<S, A>) => {
        dispatch(postMessage(message));
        switch (message.type) {
          case MessageTypes.DISPATCH: {
            switch (message.payload.type) {
              case ActionTypes.PAUSE_RECORDING:
                recordingRef.current = message.payload.status;
                break;
              case ActionTypes.LOCK_CHANGES:
                lockedRef.current = message.payload.status;
                break;
              default:
                break;
            }
          }
        }
      }),
    [dispatch],
  );

  return [state, dispatch];
}

export const useReducerWithProdDevtools = useReducerWithDevtoolsImpl;

export const useReducerWithDevtools: typeof useReducerWithDevtoolsImpl =
  process.env.NODE_ENV === "development"
    ? useReducerWithDevtoolsImpl
    : useReducerWithLazyState;
