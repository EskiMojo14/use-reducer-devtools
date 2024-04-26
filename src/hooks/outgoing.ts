import type { Dispatch, MutableRefObject } from "react";
import { useEffect } from "react";
import { UseReducerActions, ensureAction, isAction } from "../actions";
import type { ActionState, ConnectResponse } from "../types";

export function useOutgoingActions<S, A>(
  actions: ActionState<S, A>["actions"],
  dispatch: Dispatch<A>,
  connectionRef: MutableRefObject<ConnectResponse | null>,
) {
  useEffect(() => {
    if (!connectionRef.current) return;
    let entry = actions.shift();
    while (entry) {
      const [action, state] = entry;
      const isReduxAction = isAction(action);
      if (isReduxAction && action.type === UseReducerActions.INIT) {
        connectionRef.current.init(state);
      } else {
        connectionRef.current.send(
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          isReduxAction && action.type === UseReducerActions.NULL
            ? (null as never)
            : ensureAction(action),
          state,
        );
      }
      entry = actions.shift();
    }
  }, [actions, connectionRef, dispatch]);
}
