/**
 * @license
 * Copyright 2025 BBUI (bbui.dev)
 * SPDX-License-Identifier: Apache-2.0
 */

import { ipcBridge } from '@/common';
import type { TChatConversation } from '@/common/config/storage';
import { resolveLocaleKey } from '@/common/utils';
import { Message } from '@arco-design/web-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useSWR, { mutate as swrMutate } from 'swr';
import { getConversationCreateErrorMessage } from '@renderer/pages/conversation/utils/conversationCreateError';
import { getConversationOrNull } from '@renderer/pages/conversation/utils/conversationCache';
import { useGuidAssistantSelection } from '@renderer/pages/guid/hooks/useGuidAssistantSelection';
import { useGuidModelSelection } from '@renderer/pages/guid/hooks/useGuidModelSelection';
import { useProvidersQuery } from '@renderer/hooks/agent/useModelProviderList';
import { useAutoTitle } from '@renderer/hooks/chat/useAutoTitle';
import { emitter } from '@renderer/utils/emitter';
import { updateWorkspaceTime } from '@renderer/utils/workspace/workspaceHistory';
import { readEdaWorkspace } from '../utils/edaWorkspace';

const STORAGE_KEY = 'eda.chat.conversation_id';

const readStoredConversationId = (): string | null => {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

const writeStoredConversationId = (id: string | null): void => {
  try {
    if (id) {
      window.localStorage.setItem(STORAGE_KEY, id);
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Storage unavailable — the in-memory id still drives this session.
  }
};

// Shared across mounts: closing and reopening the dock while the first request
// is in flight (or a StrictMode double mount) must not create two conversations.
let creationInFlight: Promise<TChatConversation> | null = null;

export type EdaConversationState = 'creating' | 'failed' | 'ready';
export type EdaConversationFailure = 'create_failed' | 'no_model' | null;

/**
 * Owns the conversation used by the EDA chat dock.
 *
 * The dock gets its own conversation, created through the same API and with the
 * same default assistant/model as the Guid page. Once it exists the dock renders
 * the ordinary conversation surface, so sending, streaming and history all use
 * the existing implementation.
 */
export const useEdaConversation = (): {
  conversation: TChatConversation | undefined;
  state: EdaConversationState;
  failure: EdaConversationFailure;
  retry: () => void;
  /** Drop the current conversation and let the dock create a fresh one. */
  startNew: () => void;
} => {
  const { t, i18n } = useTranslation();
  const localeKey = resolveLocaleKey(i18n.language);
  const agentSelection = useGuidAssistantSelection({});
  const modelSelection = useGuidModelSelection('bbrs');
  const { syncTitleFromHistory } = useAutoTitle();
  const defaultTitle = t('conversation.welcome.newConversation');

  const [conversation_id, setConversationId] = useState<string | null>(readStoredConversationId);
  const [failed, setFailed] = useState(false);

  const { data, error, isLoading, mutate } = useSWR(
    conversation_id ? `conversation/${conversation_id}` : null,
    () => getConversationOrNull(conversation_id!),
    { revalidateOnFocus: false }
  );

  // A stored id that no longer resolves (deleted conversation) is dropped so a
  // fresh one can be created for this dock.
  useEffect(() => {
    if (!conversation_id || isLoading || data !== null) return;
    writeStoredConversationId(null);
    setConversationId(null);
    void mutate(undefined, { revalidate: false });
  }, [conversation_id, data, isLoading, mutate]);

  // Keep the dock's copy of the conversation current: the send box's auto-title
  // rewrites the name server-side, which arrives here as a list change. Without
  // this the dock header keeps saying "New chat" after the first message.
  useEffect(() => {
    if (!conversation_id) return;
    return ipcBridge.conversation.listChanged.on((event) => {
      if (event.conversation_id !== conversation_id) return;
      if (event.action !== 'updated' && event.action !== 'created') return;
      void mutate();
    });
  }, [conversation_id, mutate]);

  // Same backfill the conversation page runs: a conversation still carrying the
  // default title gets one derived from its history.
  useEffect(() => {
    if (!data || data.name !== defaultTitle) return;
    void syncTitleFromHistory(data.id);
  }, [data, defaultTitle, syncTitleFromHistory]);

  const selectedAssistantId = agentSelection.selectedAssistantId;
  const isBbrs = agentSelection.selectedAssistantBackend === 'bbrs';
  const current_model = modelSelection.current_model;
  const { isLoading: providersLoading } = useProvidersQuery();
  // A bbrs assistant cannot start a turn without a provider model. Once the
  // provider list has loaded and is still empty, report it instead of spinning.
  const modelUnavailable = isBbrs && !providersLoading && modelSelection.modelList.length === 0;
  const canCreate =
    !conversation_id &&
    !failed &&
    !modelUnavailable &&
    Boolean(selectedAssistantId) &&
    (!isBbrs || Boolean(current_model));

  useEffect(() => {
    if (!canCreate) return;

    let cancelled = false;
    // The dock binds its conversation to a workspace so the agent opens the chip
    // repository instead of an empty temporary directory. Picked at creation
    // time; an existing conversation is moved by `useEdaWorkspace`.
    const workspace = readEdaWorkspace();
    const request =
      creationInFlight ??
      (creationInFlight = ipcBridge.conversation.create.invoke({
        // The ordinary default title, so the send box's auto-title path can
        // replace it with the first real message (it only rewrites this name).
        name: defaultTitle,
        model: isBbrs ? current_model : undefined,
        assistant: {
          id: selectedAssistantId!,
          locale: localeKey,
          conversation_overrides: {
            model: isBbrs ? current_model?.use_model : (agentSelection.selectedAcpModel ?? undefined),
            permission: agentSelection.selectedMode || undefined,
            thought_level: agentSelection.selectedThoughtLevelValue || undefined,
          },
        },
        extra: { workspace, custom_workspace: Boolean(workspace) },
      }));

    void request
      .then((conversation) => {
        if (!conversation?.id) throw new Error('create conversation returned no id');
        if (workspace) updateWorkspaceTime(workspace);
        writeStoredConversationId(conversation.id);
        void swrMutate(`conversation/${conversation.id}`, conversation, { revalidate: false });
        if (!cancelled) setConversationId(conversation.id);
        emitter.emit('chat.history.refresh');
      })
      .catch((creationError: unknown) => {
        if (cancelled) return;
        console.error('Failed to create the EDA conversation:', creationError);
        Message.error(getConversationCreateErrorMessage(creationError, t));
        setFailed(true);
      })
      .finally(() => {
        if (creationInFlight === request) creationInFlight = null;
      });

    return () => {
      cancelled = true;
    };
  }, [
    canCreate,
    current_model,
    defaultTitle,
    isBbrs,
    localeKey,
    selectedAssistantId,
    t,
    agentSelection.selectedAcpModel,
    agentSelection.selectedMode,
    agentSelection.selectedThoughtLevelValue,
  ]);

  const failure: EdaConversationFailure = modelUnavailable ? 'no_model' : failed || error ? 'create_failed' : null;
  const state: EdaConversationState = conversation_id ? (error ? 'failed' : 'ready') : failure ? 'failed' : 'creating';

  const startNew = useCallback(() => {
    if (!conversation_id) return;
    writeStoredConversationId(null);
    setConversationId(null);
    setFailed(false);
  }, [conversation_id]);

  return {
    conversation: data ?? undefined,
    state,
    failure,
    retry: () => {
      setFailed(false);
      void mutate();
    },
    startNew,
  };
};
