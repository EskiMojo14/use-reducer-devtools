import type { Reducer, Dispatch } from "react";
import { useDebugValue, useReducer, useRef } from "react";
import { liftReducer } from "../reducers/lift";
import type { DevtoolsConfig, NotUndefined, StatusRefs } from "../types";
import { useIncomingActions } from "./incoming";
import { useOutgoingActions } from "./outgoing";
import { useLazyRef } from "./util";

export function useReducerWithDevtools<S extends NotUndefined, A>(
  reducer: Reducer<S, A>,
  initialState: S | (() => S),
  config: DevtoolsConfig<S, A> = {},
): [S, Dispatch<A>] {
  const initialStateRef = useLazyRef(initialState);
  const connectionRef = useLazyRef(() => {
    if (typeof window !== "undefined" && window.__REDUX_DEVTOOLS_EXTENSION__) {
      const response = window.__REDUX_DEVTOOLS_EXTENSION__.connect({
        ...config,
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        name: config.name ?? `useReducerWithDevtools`,
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
