import type { Reducer, Dispatch } from "react";
import { useDebugValue, useReducer, useRef } from "react";
import { liftReducer } from "../reducers/lift";
import {
  type ConnectResponse,
  type DevtoolsConfig,
  type NotUndefined,
  type StatusRefs,
} from "../types";
import { withDefaults } from "./config";
import { useIncomingActions } from "./incoming";
import { useOutgoingActions } from "./outgoing";
import { useFirstRenderEffect, useLazyRef } from "./util";

export function useReducerWithDevtools<S extends NotUndefined, A>(
  reducer: Reducer<S, A>,
  initialState: S | (() => S),
  config: DevtoolsConfig<S, A> = {},
): [S, Dispatch<A>] {
  const initialStateRef = useLazyRef(initialState);
  const connectionRef = useRef<ConnectResponse | null>(null);
  useFirstRenderEffect(() => {
    if (typeof window !== "undefined" && window.__REDUX_DEVTOOLS_EXTENSION__) {
      const response = (connectionRef.current =
        window.__REDUX_DEVTOOLS_EXTENSION__.connect(withDefaults(config)));
      response.init(initialStateRef.current);
    }
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
