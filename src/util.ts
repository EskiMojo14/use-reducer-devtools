import type { Config } from "@redux-devtools/extension";
import type { LiftedState } from "@redux-devtools/instrument";
import { immutableSerialize } from "@redux-devtools/serialize";
import type { ActionCreatorObject } from "@redux-devtools/utils";
import { getActionsArray } from "@redux-devtools/utils";
import jsan from "jsan";

import { unwrapAction, type EnsureAction } from "./actions";

export const parseState = (state: string, serialize: Config["serialize"]): unknown => {
  if (typeof serialize !== "object") {
    return jsan.parse(state);
  }
  if (serialize.immutable) {
    // The extension's Config types the Immutable library as unknown.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    const immutable = serialize.immutable as Parameters<typeof immutableSerialize>[0];
    return jsan.parse(
      state,
      immutableSerialize(immutable, serialize.refs, serialize.replacer, serialize.reviver).reviver,
    );
  }
  return jsan.parse(state, serialize.reviver);
};

export const processActionCreators = (
  actionCreators: Config["actionCreators"],
): Array<ActionCreatorObject> => {
  if (!actionCreators) {
    return [];
  }
  if (Array.isArray(actionCreators)) {
    return actionCreators.flatMap<ActionCreatorObject>((actionCreator) =>
      getActionsArray({ "": actionCreator }),
    );
  }
  return getActionsArray(actionCreators);
};

export const getToggledState = <S, A>(
  reducer: (state: S, action: A) => S,
  state: S,
  id: number,
  strState: string,
  serialize: Config["serialize"],
) => {
  const liftedState = parseState(strState, serialize) as LiftedState<S, EnsureAction<A>, unknown>;
  const idx = liftedState.skippedActionIds.indexOf(id);
  const skipped = idx !== -1;
  const start = liftedState.stagedActionIds.indexOf(id);
  if (start < 1) return { nextState: state, liftedState };

  if (skipped) {
    liftedState.skippedActionIds.splice(idx, 1);
  } else {
    liftedState.skippedActionIds.push(id);
  }

  let nextState = liftedState.computedStates[start - 1]!.state;
  for (let i = start; i < liftedState.stagedActionIds.length; i++) {
    const actionId = liftedState.stagedActionIds[i]!;
    if (!liftedState.skippedActionIds.includes(actionId)) {
      nextState = reducer(nextState, unwrapAction(liftedState.actionsById[actionId]!.action));
    }
    liftedState.computedStates[i] = { state: nextState };
  }

  const selectedState = liftedState.computedStates[liftedState.currentStateIndex];
  if (!selectedState) {
    throw new Error("DevTools history is missing the selected computed state");
  }
  return { nextState: selectedState.state, liftedState };
};
