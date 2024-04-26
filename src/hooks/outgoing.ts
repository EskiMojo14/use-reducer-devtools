import type { Dispatch, MutableRefObject } from "react";
import { useEffect } from "react";
import type { Action } from "../actions";
import { UseReducerActions } from "../actions";
import type { ActionState, ConnectResponse } from "../types";

export function useOutgoingActions<S, A extends Action>(
  actions: ActionState<S, A>["actions"],
  dispatch: Dispatch<A>,
  connectionRef: MutableRefObject<ConnectResponse | null>,
) {
  useEffect(() => {
    if (!connectionRef.current) return;
    let entry = actions.shift();
    while (entry) {
      const [action, state] = entry;
      if (action.type === UseReducerActions.INIT) {
        connectionRef.current.init(state);
      } else {
        connectionRef.current.send(
          action.type === UseReducerActions.NULL ? (null as never) : action,
          state,
        );
      }
      entry = actions.shift();
    }
  }, [actions, connectionRef, dispatch]);
}
