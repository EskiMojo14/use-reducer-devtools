import type { Config } from "@redux-devtools/extension";

export const withDefaults = (config: Config = {}): Config => ({
  ...config,
  name: config.name ?? "useReducerWithDevtools",
  features: {
    pause: true, // start/pause recording of dispatched actions
    lock: true, // lock/unlock dispatching actions and side effects
    persist: true, // persist states on page reloading
    export: true, // export history of actions in a file
    import: "custom", // import history of actions from a file
    jump: true, // jump back and forth (time travelling)
    skip: true, // skip (cancel) actions
    // Non-Redux REORDER_ACTION messages omit the history needed to replay actions.
    reorder: false,
    dispatch: true, // dispatch custom actions or action creators
    test: false, // generate tests for the selected actions
    ...config.features,
  },
});
