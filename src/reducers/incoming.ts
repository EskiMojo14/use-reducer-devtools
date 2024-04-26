import type { Config } from "@redux-devtools/extension";
import type { LiftedState } from "@redux-devtools/instrument";
import { evalAction } from "@redux-devtools/utils";
import type { Reducer } from "react";
import type { Action, IncomingMessage } from "../actions";
import { ActionTypes, MessageTypes, UseReducerActions } from "../actions";
import type { ActionState } from "../types";
import { getToggledState, processActionCreators } from "../util";

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

export const processAction = <S, A extends Action>(
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

export const messageReducer = <S, A extends Action>(
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
