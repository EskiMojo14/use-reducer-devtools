import type { Config } from "@redux-devtools/extension";
import type { MutableRefObject, Reducer } from "react";
import type { Action, IncomingMessageAction } from "../actions";
import { incomingMessage } from "../actions";
import type { ActionState, StatusRefs } from "../types";
import { messageReducer, processAction } from "./incoming";

export const liftReducer =
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
