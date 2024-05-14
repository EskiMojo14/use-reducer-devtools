import type {
  Dispatch,
  EffectCallback,
  MutableRefObject,
  Reducer,
} from "react";
import { useDebugValue, useEffect, useReducer, useRef } from "react";
import type { NotUndefined } from "../types";

const useDevDebugValue: typeof useDebugValue =
  process.env.NODE_ENV === "development" ? useDebugValue : () => {};

function isStateFunction<S>(state: S | (() => S)): state is () => S {
  return typeof state === "function";
}

const getInitialState = <S>(initialState: S | (() => S)): S =>
  isStateFunction(initialState) ? initialState() : initialState;

/**
 * A simple wrapper that allows using a lazy state initializer with `useReducer`.
 *
 * @example
 * const [state, dispatch] = useReducerWithLazyState(reducer, () => initialState);
 */
export function useReducerWithLazyState<S, A>(
  reducer: Reducer<S, A>,
  initialState: S | (() => S),
): [S, Dispatch<A>] {
  const [state, dispatch] = useReducer(reducer, 0, () =>
    getInitialState(initialState),
  );

  useDebugValue(state);

  return [state, dispatch];
}

export function useLazyRef<T extends NotUndefined>(
  value: T | (() => T),
): MutableRefObject<T> {
  const ref = useRef<T>();
  if (ref.current === undefined) {
    ref.current = getInitialState(value);
  }

  useDevDebugValue(ref.current);

  return ref as MutableRefObject<T>;
}

export function useFirstRenderEffect(effect: EffectCallback) {
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return effect();
    }
  }, []);
}
