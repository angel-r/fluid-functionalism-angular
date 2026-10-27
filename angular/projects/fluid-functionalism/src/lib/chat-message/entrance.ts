import { InjectionToken } from '@angular/core';

/**
 * Lets a directive on the same element take over a chat message's entrance
 * (React `initial={false}`): the queued-stack morph springs the bubble in from
 * the dispatched card instead. Internal to the library.
 */
export interface ChatMessageEntranceOverride {
  /** Decides once, on the first render; true when it plays the entrance. */
  takeOverEntrance(): boolean;
}

export const CHAT_MESSAGE_ENTRANCE_OVERRIDE = new InjectionToken<ChatMessageEntranceOverride>(
  'CHAT_MESSAGE_ENTRANCE_OVERRIDE',
);
