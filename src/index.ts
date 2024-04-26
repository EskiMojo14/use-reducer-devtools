import type { Config } from "@redux-devtools/extension";
import type { LiftedState } from "@redux-devtools/instrument";
import { evalAction } from "@redux-devtools/utils";
import type { Reducer, Dispatch, MutableRefObject } from "react";
import { useDebugValue, useReducer, useRef } from "react";
import type { Action, IncomingMessage, IncomingMessageAction } from "./actions";
import {
  ActionTypes,
  MessageTypes,
  UseReducerActions,
  incomingMessage,
} from "./actions";
import { useIncomingActions } from "./hooks/incoming";
import { useOutgoingActions } from "./hooks/outgoing";
import { useLazyRef, useReducerWithLazyState } from "./hooks/util";
import type { ActionState, NotUndefined, StatusRefs } from "./types";
import { processActionCreators, toggleAction as getToggledState } from "./util";

let instanceId = 5000;
function getInstanceId(configId?: number) {
  return configId ?? instanceId++;
}

const shouldInitState = <S, A extends Action>(state: S): ActionState<S, A> => ({
  state,
  actions: [[{ type: UseReducerActions.INIT }, state]],
});

const clearActions = <S, A extends Action>(state: S): ActionState<S, A> => ({
  state,
  actions: [],
});

const withAction = <S, A extends Action>(
  state: ActionState<S, A>,
  action: A,
  nextState: S,
): ActionState<S, A> => ({
  state: nextState,
  actions: [...state.actions, [action, nextState]],
});

const processAction = <S, A extends Action>(
  reducer: Reducer<S, A>,
  state: ActionState<S, A>,
  action: A,
): ActionState<S, A> => {
  const nextState = reducer(state.state, action);
  return withAction(state, action, nextState);
};

const toggleAction = <S, A extends Action>(
  reducer: Reducer<S, A>,
  state: ActionState<S, A>,
  id: number,
  strState: string,
): ActionState<S, A> => {
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
  state: ActionState<S, A>,
  nextLiftedState: LiftedState<S, A, unknown>,
): ActionState<S, A> => ({
  state: nextLiftedState.computedStates.slice(-1)[0]?.state ?? state.state,
  actions: [
    ...state.actions,
    [{ type: UseReducerActions.NULL }, nextLiftedState],
  ],
});

const messageReducer = <S, A extends Action>(
  state: ActionState<S, A>,
  message: IncomingMessage<S, A>,
  reducer: Reducer<S, A>,
  initialState: S,
  config: Config,
  paused: boolean,
): ActionState<S, A> => {
  switch (message.type) {
    case MessageTypes.DISPATCH: {
      switch (message.payload.type) {
        case ActionTypes.RESET: {
          return shouldInitState(initialState);
        }
        case ActionTypes.COMMIT: {
          return shouldInitState(state.state);
        }
        case ActionTypes.ROLLBACK: {
          return shouldInitState(JSON.parse(message.state) as S);
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
        case ActionTypes.PAUSE_RECORDING: {
          // paused here has already updated
          if (paused) {
            return state;
          }
          return shouldInitState(state.state);
        }
        default:
          return state;
      }
    }
    case MessageTypes.ACTION: {
      const action = evalAction(
        message.payload,
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
    initialState: S,
    config: Config,
    statusRefs: MutableRefObject<StatusRefs>,
  ): Reducer<ActionState<S, A>, A | IncomingMessageAction<S, A>> =>
  (state, action) => {
    const { locked, paused } = statusRefs.current;
    if (locked) return state;

    if (incomingMessage.match<S, A>(action)) {
      return messageReducer(
        state,
        action.payload,
        reducer,
        initialState,
        config,
        paused,
      );
    }

    if (paused) {
      return {
        state: reducer(state.state, action),
        actions: state.actions,
      };
    }

    return processAction(reducer, state, action);
  };

function useReducerWithDevtoolsImpl<S extends NotUndefined, A extends Action>(
  reducer: Reducer<S, A>,
  initialState: S | (() => S),
  config: Config & { instanceId?: number } = {},
): [S, Dispatch<A>] {
  const initialStateRef = useLazyRef(initialState);
  const instanceIdRef = useLazyRef(() => getInstanceId(config.instanceId));
  const connectionRef = useLazyRef(() => {
    if (typeof window !== "undefined" && window.__REDUX_DEVTOOLS_EXTENSION__) {
      const response = window.__REDUX_DEVTOOLS_EXTENSION__.connect({
        ...config,
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        name: config.name ?? `useReducerWithDevtools ${instanceIdRef.current}`,
        // @ts-expect-error undocumented
        instanceId: instanceIdRef.current,
      });
      response.init(initialStateRef.current);
      return response;
    }
    return null;
  });

  const statusRefs = useRef<StatusRefs>({
    paused: config.shouldRecordChanges === false,
    locked: config.shouldStartLocked === true,
    subscribed: false,
  });

  const [{ state, actions }, dispatch] = useReducer(
    liftReducer(reducer, initialStateRef.current, config, statusRefs),
    {
      state: initialStateRef.current,
      actions: [],
    },
  );

  useOutgoingActions(actions, dispatch, connectionRef);

  useIncomingActions(dispatch, connectionRef, statusRefs);

  useDebugValue(state);

  return [state, dispatch];
}

export const useReducerWithProdDevtools = useReducerWithDevtoolsImpl;

const shouldUseDevtools =
  process.env.NODE_ENV === "development" &&
  typeof window !== "undefined" &&
  window.__REDUX_DEVTOOLS_EXTENSION__;

export const useReducerWithDevtools: typeof useReducerWithDevtoolsImpl =
  shouldUseDevtools ? useReducerWithDevtoolsImpl : useReducerWithLazyState;
