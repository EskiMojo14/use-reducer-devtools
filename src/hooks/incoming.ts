import type { Dispatch, MutableRefObject } from "react";
import { useEffect } from "react";
import type {
  Action,
  IncomingMessage,
  IncomingMessageAction,
} from "../actions";
import { ActionTypes, MessageTypes, incomingMessage } from "../actions";
import type { ConnectResponse, StatusRefs } from "../types";

export function useIncomingActions<S, A extends Action>(
  dispatch: Dispatch<IncomingMessageAction<S, A>>,
  connectionRef: MutableRefObject<ConnectResponse | null>,
  statusRefs: MutableRefObject<StatusRefs>,
) {
  useEffect(
    () =>
      (
        connectionRef.current as unknown as {
          subscribe: (
            listener: (message: IncomingMessage<S, A>) => void,
          ) => () => void;
        } | null
      )?.subscribe((message) => {
        switch (message.type) {
          case MessageTypes.START:
          case MessageTypes.STOP:
            statusRefs.current.subscribed = message.type === MessageTypes.START;
            return;
          case MessageTypes.DISPATCH:
            switch (message.payload.type) {
              case ActionTypes.PAUSE_RECORDING:
                statusRefs.current.paused = message.payload.status;
                break;
              case ActionTypes.LOCK_CHANGES:
                statusRefs.current.locked = message.payload.status;
                break;
            }
            break;
        }
        dispatch(incomingMessage(message));
      }),
    [connectionRef, dispatch, statusRefs],
  );
}
