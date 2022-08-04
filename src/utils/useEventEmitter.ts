import { useRef } from "react";
// eslint-disable-next-line no-restricted-imports
import EventEmitter from "events";
import { v4 as uuid } from 'uuid';

export type EventHandler = (...args: any[]) => void;

export default function useEventEmitter(baseName = 'default') {
  const { current: emitter } = useRef<EventEmitter>(new EventEmitter());
  const { current: handlerMap } = useRef<Map<string, EventHandler>>(new Map());

  const getHandler = (handlerId: string) => handlerMap.get(handlerId);

  const setHandler = (handler: EventHandler) => {
    const handlerId = uuid();

    handlerMap.set(handlerId, handler);

    return handlerId;
  }

  const addEventListener = (eventName: string, handler: (...args: any[]) => void) => {
    emitter.on(`${baseName}:${eventName}`, handler);
    return setHandler(handler);
  }

  const removeEventListener = (eventName: string, handlerId: string) => {
    const handler = getHandler(handlerId);
    if (!handler) return;

    emitter.off(`${baseName}:${eventName}`, handler);
  }

  const emit = (eventName: string, ...args: any[]) => {
    return emitter.emit(`${baseName}:${eventName}`, ...args);
  }

  return {
    emit,
    addEventListener,
    removeEventListener
  };
}