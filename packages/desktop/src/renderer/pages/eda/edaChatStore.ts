/**
 * @license
 * Copyright 2025 BBUI (bbui.dev)
 * SPDX-License-Identifier: Apache-2.0
 */

import { useSyncExternalStore } from 'react';

const OPEN_STORAGE_KEY = 'eda.chat.open';

export type EdaChatStoreState = {
  /** Whether the dock column is shown. Persisted across launches. */
  open: boolean;
  /**
   * Prompt an "Ask agent" button handed to the dock. Delivered to the dock's
   * send box once it is mounted, then cleared.
   */
  pendingPrompt: string | null;
};

const readStoredOpen = (): boolean => {
  try {
    return window.localStorage.getItem(OPEN_STORAGE_KEY) !== '0';
  } catch {
    return true;
  }
};

let state: EdaChatStoreState = { open: readStoredOpen(), pendingPrompt: null };
const listeners = new Set<() => void>();

const publish = (next: EdaChatStoreState): void => {
  state = next;
  for (const listener of listeners) listener();
};

const persistOpen = (open: boolean): void => {
  try {
    window.localStorage.setItem(OPEN_STORAGE_KEY, open ? '1' : '0');
  } catch {
    // Storage unavailable — the open state still holds for this session.
  }
};

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getState = (): EdaChatStoreState => state;

/** Dock open state and the prompt waiting for its send box. */
export const useEdaChatState = (): EdaChatStoreState => useSyncExternalStore(subscribe, getState, getState);

export const setEdaChatOpen = (open: boolean): void => {
  if (state.open === open) return;
  persistOpen(open);
  publish({ ...state, open });
};

/**
 * Queues a prompt from an "Ask agent" button and reveals the dock.
 *
 * The dock delivers it to the conversation's send box — which may not exist
 * yet — and the send-box prefill channel keeps it queued until that box mounts.
 */
export const requestEdaChatPrompt = (prompt: string): void => {
  if (!prompt) return;
  persistOpen(true);
  publish({ open: true, pendingPrompt: prompt });
};

/** Hands the queued prompt to the dock exactly once. */
export const consumeEdaChatPrompt = (): string | null => {
  const { pendingPrompt } = state;
  if (!pendingPrompt) return null;
  publish({ ...state, pendingPrompt: null });
  return pendingPrompt;
};

/** Test hook: reset module state. */
export const resetEdaChatStoreForTest = (): void => {
  state = { open: true, pendingPrompt: null };
  listeners.clear();
};
