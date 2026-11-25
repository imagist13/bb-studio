/**
 * @license
 * Copyright 2025 BBUI (bbui.dev)
 * SPDX-License-Identifier: Apache-2.0
 */

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  consumeEdaChatPrompt,
  requestEdaChatPrompt,
  resetEdaChatStoreForTest,
  setEdaChatOpen,
  useEdaChatState,
} from '@renderer/pages/eda/edaChatStore';

const OPEN_STORAGE_KEY = 'eda.chat.open';

describe('edaChatStore', () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetEdaChatStoreForTest();
  });

  it('persists the dock open state', () => {
    const { result } = renderHook(() => useEdaChatState());
    expect(result.current.open).toBe(true);

    act(() => setEdaChatOpen(false));

    expect(result.current.open).toBe(false);
    expect(window.localStorage.getItem(OPEN_STORAGE_KEY)).toBe('0');
  });

  it('opens the dock and queues a prompt once', () => {
    const { result } = renderHook(() => useEdaChatState());
    act(() => setEdaChatOpen(false));

    act(() => requestEdaChatPrompt('chip=toy: which balls are blocked?'));

    expect(result.current.open).toBe(true);
    expect(result.current.pendingPrompt).toBe('chip=toy: which balls are blocked?');

    let first: string | null = null;
    let second: string | null = 'not consumed';
    act(() => {
      first = consumeEdaChatPrompt();
      second = consumeEdaChatPrompt();
    });

    expect(first).toBe('chip=toy: which balls are blocked?');
    expect(second).toBeNull();
    expect(result.current.pendingPrompt).toBeNull();
  });
});
