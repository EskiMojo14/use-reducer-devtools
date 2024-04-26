import type {
  LiftedAction,
  ActionTypes as InstrumentActionTypes,
} from "@redux-devtools/instrument";

export interface Action<T extends string = string> {
  type: T;
}

export const ActionTypes: typeof InstrumentActionTypes = {
  PERFORM_ACTION: "PERFORM_ACTION",
  RESET: "RESET",
  ROLLBACK: "ROLLBACK",
  COMMIT: "COMMIT",
  SWEEP: "SWEEP",
  TOGGLE_ACTION: "TOGGLE_ACTION",
  SET_ACTIONS_ACTIVE: "SET_ACTIONS_ACTIVE",
  JUMP_TO_STATE: "JUMP_TO_STATE",
  JUMP_TO_ACTION: "JUMP_TO_ACTION",
  REORDER_ACTION: "REORDER_ACTION",
  IMPORT_STATE: "IMPORT_STATE",
  LOCK_CHANGES: "LOCK_CHANGES",
  PAUSE_RECORDING: "PAUSE_RECORDING",
} as const;

export const MessageTypes = {
  DISPATCH: "DISPATCH",
  ACTION: "ACTION",
  START: "START",
  STOP: "STOP",
} as const;

export type IncomingMessage<S, A extends Action> =
  | (Action<typeof MessageTypes.DISPATCH> & {
      payload: LiftedAction<S, A, unknown>;
      state: string;
    })
  | (Action<typeof MessageTypes.ACTION> & {
      payload: string;
    })
  | Action<typeof MessageTypes.START>
  | Action<typeof MessageTypes.STOP>;

const prefix = "@@USE_REDUCER_WITH_DEVTOOLS";

export const UseReducerActions = {
  /** A message received from the devtools connection */
  INCOMING: `${prefix}/INCOMING`,
  /** We should call .init */
  INIT: `${prefix}/INIT`,
  /** special case - send should be called with null */
  NULL: `${prefix}/NULL`,
} as const;

export interface IncomingMessageAction<S, A extends Action> {
  type: typeof UseReducerActions.INCOMING;
  payload: IncomingMessage<S, A>;
}

export function incomingMessage<S, A extends Action>(
  message: IncomingMessage<S, A>,
): IncomingMessageAction<S, A> {
  return {
    type: UseReducerActions.INCOMING,
    payload: message,
  };
}

incomingMessage.match = <S, A extends Action>(
  action: Action,
): action is IncomingMessageAction<S, A> =>
  action.type === UseReducerActions.INCOMING;

export function isAction(action: unknown): action is Action {
  return typeof action === "object" && !!action && "type" in action;
}

const isWrappedAction = `${prefix}/IS_WRAPPED_ACTION`;

interface WrappedAction<A> extends Action {
  payload: A;
  meta: {
    [isWrappedAction]: true;
  };
}

export type EnsureAction<A> = A extends Action ? A : WrappedAction<A>;

export function wrappedAction<A>(action: A): WrappedAction<A> {
  return {
    type: `dispatch: ${JSON.stringify(action)}`,
    payload: action,
    meta: { [isWrappedAction]: true },
  };
}

wrappedAction.match = (action: Action): action is WrappedAction<unknown> =>
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
  !!(action as any).meta?.[isWrappedAction];

export function ensureAction<A>(action: A): EnsureAction<A> {
  return (isAction(action) ? action : wrappedAction(action)) as never;
}

export function unwrapAction<A>(action: (Action & A) | WrappedAction<A>): A {
  return wrappedAction.match(action) ? action.payload : action;
}
