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

const { createMock, getConversationMock, emitMock, syncTitleMock } = vi.hoisted(() => ({
  createMock: vi.fn(),
  getConversationMock: vi.fn(),
  emitMock: vi.fn(),
  syncTitleMock: vi.fn(async () => {}),
}));

vi.mock('@/common', () => ({
  ipcBridge: {
    conversation: {
      create: { invoke: createMock },
      listChanged: { on: () => () => {} },
    },
  },
}));

vi.mock('@/common/utils', () => ({ resolveLocaleKey: () => 'en-US' }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en-US' } }),
}));

vi.mock('@renderer/pages/guid/hooks/useGuidAssistantSelection', () => ({
  useGuidAssistantSelection: () => ({
    selectedAssistantId: 'assistant-1',
    selectedAssistantBackend: 'claude',
    selectedAcpModel: null,
    selectedMode: 'default',
    selectedThoughtLevelValue: '',
  }),
}));

vi.mock('@renderer/pages/guid/hooks/useGuidModelSelection', () => ({
  useGuidModelSelection: () => ({ current_model: undefined, modelList: [] }),
}));

vi.mock('@renderer/hooks/agent/useModelProviderList', () => ({
  useProvidersQuery: () => ({ isLoading: false }),
}));

vi.mock('@renderer/pages/conversation/utils/conversationCache', () => ({
  getConversationOrNull: getConversationMock,
}));

vi.mock('@renderer/pages/conversation/utils/conversationCreateError', () => ({
  getConversationCreateErrorMessage: () => 'create failed',
}));

vi.mock('@renderer/utils/emitter', () => ({ emitter: { emit: emitMock } }));

vi.mock('@renderer/hooks/chat/useAutoTitle', () => ({
  useAutoTitle: () => ({ syncTitleFromHistory: syncTitleMock }),
}));

import { useEdaConversation } from '@renderer/pages/eda/hooks/useEdaConversation';

const STORAGE_KEY = 'eda.chat.conversation_id';

const makeConversation = (id: string): TChatConversation =>
  ({ id, name: 'Agent chat', type: 'acp', extra: {}, created_at: 0, modified_at: 0 }) as unknown as TChatConversation;

// A fresh SWR cache per test so conversation keys do not leak between cases.
const wrapper = ({ children }: { children: React.ReactNode }): React.ReactElement => (
  <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>{children}</SWRConfig>
);

describe('useEdaConversation', () => {
  beforeEach(() => {
    window.localStorage.clear();
    createMock.mockReset();
    getConversationMock.mockReset();
    emitMock.mockReset();
  });

  it('creates a conversation with the default assistant when the dock has none', async () => {
    createMock.mockResolvedValue(makeConversation('conv-new'));
    getConversationMock.mockResolvedValue(makeConversation('conv-new'));

    const { result } = renderHook(() => useEdaConversation(), { wrapper });

    await waitFor(() => expect(result.current.state).toBe('ready'));

    expect(createMock).toHaveBeenCalledTimes(1);
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        assistant: expect.objectContaining({ id: 'assistant-1', locale: 'en-US' }),
        extra: { workspace: '', custom_workspace: false },
      })
    );
    expect(result.current.conversation?.id).toBe('conv-new');
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('conv-new');
    expect(emitMock).toHaveBeenCalledWith('chat.history.refresh');
  });

  it('binds the stored workspace when creating the conversation', async () => {
    window.localStorage.setItem('eda.chat.workspace', 'D:/acode/bb/buckyball');
    createMock.mockResolvedValue(makeConversation('conv-ws'));
    getConversationMock.mockResolvedValue(makeConversation('conv-ws'));

    const { result } = renderHook(() => useEdaConversation(), { wrapper });

    await waitFor(() => expect(result.current.state).toBe('ready'));

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({ extra: { workspace: 'D:/acode/bb/buckyball', custom_workspace: true } })
    );
  });

  it('falls back to the most recently used workspace', async () => {
    window.localStorage.setItem(
      'bb_workspace_update_time',
      JSON.stringify({ '/old/repo': 1, '/recent/repo': 9, '/mid/repo': 5 })
    );
    createMock.mockResolvedValue(makeConversation('conv-history'));
    getConversationMock.mockResolvedValue(makeConversation('conv-history'));

    const { result } = renderHook(() => useEdaConversation(), { wrapper });

    await waitFor(() => expect(result.current.state).toBe('ready'));

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({ extra: { workspace: '/recent/repo', custom_workspace: true } })
    );
  });

  it('reuses the stored conversation instead of creating another one', async () => {
    window.localStorage.setItem(STORAGE_KEY, 'conv-existing');
    getConversationMock.mockResolvedValue(makeConversation('conv-existing'));

    const { result } = renderHook(() => useEdaConversation(), { wrapper });

    await waitFor(() => expect(result.current.state).toBe('ready'));

    expect(result.current.conversation?.id).toBe('conv-existing');
    expect(createMock).not.toHaveBeenCalled();
  });

  it('replaces a stored conversation that no longer exists', async () => {
    window.localStorage.setItem(STORAGE_KEY, 'conv-gone');
    getConversationMock.mockImplementation(async (id: string) => (id === 'conv-gone' ? null : makeConversation(id)));
    createMock.mockResolvedValue(makeConversation('conv-fresh'));

    const { result } = renderHook(() => useEdaConversation(), { wrapper });

    await waitFor(() => expect(result.current.conversation?.id).toBe('conv-fresh'));

    expect(createMock).toHaveBeenCalledTimes(1);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('conv-fresh');
  });

  it('starts a new conversation when asked', async () => {
    window.localStorage.setItem(STORAGE_KEY, 'conv-existing');
    getConversationMock.mockImplementation(async (id: string) => makeConversation(id));
    createMock.mockResolvedValue(makeConversation('conv-next'));

    const { result } = renderHook(() => useEdaConversation(), { wrapper });

    await waitFor(() => expect(result.current.state).toBe('ready'));
    expect(result.current.conversation?.id).toBe('conv-existing');

    act(() => result.current.startNew());

    await waitFor(() => expect(result.current.conversation?.id).toBe('conv-next'));

    expect(createMock).toHaveBeenCalledTimes(1);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('conv-next');
  });
});
