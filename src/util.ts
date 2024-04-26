import type { Config } from "@redux-devtools/extension";
import type { LiftedState } from "@redux-devtools/instrument";
import type { ActionCreatorObject } from "@redux-devtools/utils";
import { getActionsArray } from "@redux-devtools/utils";
import type { ActionCreator } from "redux";
import type { Action } from "./actions";

const actionCreatorCache = new Map<string, Array<ActionCreatorObject>>();

export const processActionCreators = (
  actionCreators: Config["actionCreators"],
): Array<ActionCreatorObject> => {
  if (!actionCreators) {
    return [];
  }
  const cacheKey = JSON.stringify(actionCreators);
  if (actionCreatorCache.has(cacheKey)) {
    return actionCreatorCache.get(cacheKey)!;
  }
  if (Array.isArray(actionCreators)) {
    const actionsArray = actionCreators.flatMap<ActionCreatorObject>(
      (actionCreator) => getActionsArray({ "": actionCreator }),
    );
    actionCreatorCache.set(cacheKey, actionsArray);
  }
  const actionsArray = getActionsArray(
    actionCreators as Record<string, ActionCreator<Action>>,
  );
  actionCreatorCache.set(cacheKey, actionsArray);
  return actionsArray;
};

export const toggleAction = <S, A extends Action>(
  reducer: (state: S, action: A) => S,
  state: S,
  id: number,
  strState: string,
) => {
  const liftedState = JSON.parse(strState) as LiftedState<S, A, unknown>;
  const idx = liftedState.skippedActionIds.indexOf(id);
  const skipped = idx !== -1;
  const start = liftedState.stagedActionIds.indexOf(id);
  if (start === -1) return { nextState: state, liftedState };

  let nextState = liftedState.computedStates[start - 1]!.state;

  for (
    let i = skipped ? start : start + 1;
    i < liftedState.stagedActionIds.length;
    i++
  ) {
    if (
      i !== start &&
      liftedState.skippedActionIds.includes(liftedState.stagedActionIds[i]!)
    )
      continue; // it's already skipped
    nextState = reducer(
      nextState,
      liftedState.actionsById[liftedState.stagedActionIds[i]!].action,
    );
    liftedState.computedStates[i]!.state = nextState;
  }

  if (skipped) {
    liftedState.skippedActionIds.splice(idx, 1);
  } else {
    liftedState.skippedActionIds.push(id);
  }

  return { nextState, liftedState };
};
