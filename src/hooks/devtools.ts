import type { Config } from "@redux-devtools/extension";
import type { Reducer, Dispatch } from "react";
import { useDebugValue, useReducer, useRef } from "react";
import { liftReducer } from "../reducers/lift";
import type { NotUndefined, StatusRefs } from "../types";
import { useIncomingActions } from "./incoming";
import { useOutgoingActions } from "./outgoing";
import { useLazyRef } from "./util";

let instanceId = 5000;
function getNextId() {
  return instanceId++;
}

export function useReducerWithDevtools<S extends NotUndefined, A>(
  reducer: Reducer<S, A>,
  initialState: S | (() => S),
  config: Config & { instanceId?: number } = {},
): [S, Dispatch<A>] {
  const initialStateRef = useLazyRef(initialState);
  const instanceIdRef = useLazyRef(() => config.instanceId ?? getNextId());
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
