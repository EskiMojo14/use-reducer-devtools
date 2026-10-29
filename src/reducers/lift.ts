import type { MutableRefObject, Reducer } from "react";

import type { EnsureAction, IncomingMessageAction } from "../actions";
import { incomingMessage, MessageTypes } from "../actions";
import type { ActionState, DevtoolsConfig, StatusRefs } from "../types";
import { messageReducer, processAction } from "./incoming";

export const liftReducer =
  <S, A>(
    reducer: Reducer<S, A>,
    initialState: S,
    config: DevtoolsConfig<S, A>,
    statusRefs: MutableRefObject<StatusRefs>,
  ): Reducer<ActionState<S, A>, A | IncomingMessageAction<S, EnsureAction<A>>> =>
  (state, action) => {
    const { locked, paused } = statusRefs.current;
    if (incomingMessage.match<S, EnsureAction<A>>(action)) {
      if (locked && action.payload.type === MessageTypes.ACTION) return state;
      return messageReducer(state, action.payload, reducer, initialState, config, paused);
    }

    if (locked) return state;

    if (paused) {
      return {
        state: reducer(state.state, action),
        actions: state.actions,
      };
    }

    return processAction(reducer, state, action);
  };
