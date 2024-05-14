import { useReducerWithDevtools as useReducerWithDevtoolsImpl } from "./hooks/devtools";
import { useReducerWithLazyState } from "./hooks/util";

export { useReducerWithLazyState };
export type { DevtoolsConfig } from "./types";

export const useReducerWithProdDevtools = useReducerWithDevtoolsImpl;

const shouldUseDevtools =
  process.env.NODE_ENV === "development" &&
  typeof window !== "undefined" &&
  window.__REDUX_DEVTOOLS_EXTENSION__;

export const useReducerWithDevtools: typeof useReducerWithDevtoolsImpl =
  shouldUseDevtools ? useReducerWithDevtoolsImpl : useReducerWithLazyState;
