/**
 * @license
 * Copyright 2025 BBUI (bbui.dev)
 * SPDX-License-Identifier: Apache-2.0
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { SWRConfig } from 'swr';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TChatConversation } from '@/common/config/storage';

const { updateMock, showOpenMock, getConversationMock, emitMock } = vi.hoisted(() => ({
  updateMock: vi.fn(),
  showOpenMock: vi.fn(),
  getConversationMock: vi.fn(),
  emitMock: vi.fn(),
}));

vi.mock('@/common', () => ({
  ipcBridge: {
    conversation: {
      update: { invoke: updateMock },
    },
    dialog: {
      showOpen: { invoke: showOpenMock },
    },
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@renderer/pages/conversation/utils/conversationCache', () => ({
  getConversationOrNull: getConversationMock,
}));

vi.mock('@renderer/utils/emitter', () => ({ emitter: { emit: emitMock } }));

import { useEdaWorkspace } from '@renderer/pages/eda/hooks/useEdaWorkspace';

const WORKSPACE_KEY = 'eda.chat.workspace';

const makeConversation = (id: string, workspace?: string, temporary = false): TChatConversation =>
  ({
    id,
    name: 'Agent chat',
    type: 'bbrs',
    extra: { workspace, is_temporary_workspace: temporary },
    created_at: 0,
    modified_at: 0,
  }) as unknown as TChatConversation;

const wrapper = ({ children }: { children: React.ReactNode }): React.ReactElement => (
  <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>{children}</SWRConfig>
);

describe('useEdaWorkspace', () => {
  beforeEach(() => {
    window.localStorage.clear();
    updateMock.mockReset();
    updateMock.mockResolvedValue(true);
    showOpenMock.mockReset();
    getConversationMock.mockReset();
    emitMock.mockReset();
  });

  it('reports the stored workspace', () => {
    window.localStorage.setItem(WORKSPACE_KEY, 'D:/acode/bb/buckyball');

    const { result } = renderHook(() => useEdaWorkspace(undefined), { wrapper });

    expect(result.current.workspace).toBe('D:/acode/bb/buckyball');
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('moves a conversation out of its temporary workspace', async () => {
    window.localStorage.setItem(WORKSPACE_KEY, 'D:/acode/bb/buckyball');
    const conversation = makeConversation('conv-temp', 'C:/Temp/bbrs-temp-1', true);
    getConversationMock.mockResolvedValue(conversation);

    const { result } = renderHook(() => useEdaWorkspace(conversation), { wrapper });

    expect(result.current.workspace).toBe('D:/acode/bb/buckyball');

    await waitFor(() => expect(updateMock).toHaveBeenCalledTimes(1));
    expect(updateMock).toHaveBeenCalledWith({
      id: 'conv-temp',
      // Only the workspace keys: the backend rejects a full `extra` payload.
      updates: { extra: { workspace: 'D:/acode/bb/buckyball', custom_workspace: true } },
    });
    expect(emitMock).toHaveBeenCalledWith('chat.history.refresh');
  });

  it('leaves a conversation that already runs in the workspace alone', async () => {
    window.localStorage.setItem(WORKSPACE_KEY, 'D:/acode/bb/buckyball');
    const conversation = makeConversation('conv-bound', 'D:/acode/bb/buckyball');

    const { result } = renderHook(() => useEdaWorkspace(conversation), { wrapper });

    expect(result.current.workspace).toBe('D:/acode/bb/buckyball');
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('shows the conversation workspace when nothing is stored', () => {
    const conversation = makeConversation('conv-only', 'D:/somewhere/else');

    const { result } = renderHook(() => useEdaWorkspace(conversation), { wrapper });

    expect(result.current.workspace).toBe('D:/somewhere/else');
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('stores a chosen workspace and moves the conversation into it', async () => {
    window.localStorage.setItem(WORKSPACE_KEY, 'D:/old/place');
    const conversation = makeConversation('conv-choose', 'D:/old/place');
    getConversationMock.mockResolvedValue(conversation);
    showOpenMock.mockResolvedValue(['D:/acode/bb/buckyball']);

    const { result } = renderHook(() => useEdaWorkspace(conversation), { wrapper });
    await act(async () => {
      await result.current.choose();
    });

    expect(window.localStorage.getItem(WORKSPACE_KEY)).toBe('D:/acode/bb/buckyball');
    expect(result.current.workspace).toBe('D:/acode/bb/buckyball');
    expect(updateMock).toHaveBeenCalledWith({
      id: 'conv-choose',
      updates: { extra: { workspace: 'D:/acode/bb/buckyball', custom_workspace: true } },
    });
  });
});
