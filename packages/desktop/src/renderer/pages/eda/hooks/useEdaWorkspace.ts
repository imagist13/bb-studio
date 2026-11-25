/**
 * @license
 * Copyright 2025 BBUI (bbui.dev)
 * SPDX-License-Identifier: Apache-2.0
 */

import { ipcBridge } from '@/common';
import type { TChatConversation } from '@/common/config/storage';
import { Message } from '@arco-design/web-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSWRConfig } from 'swr';
import { getConversationOrNull } from '@renderer/pages/conversation/utils/conversationCache';
import { emitter } from '@renderer/utils/emitter';
import { updateWorkspaceTime } from '@renderer/utils/workspace/workspaceHistory';
import { readEdaWorkspace, writeEdaWorkspace } from '../utils/edaWorkspace';

/** Conversations already moved into the dock's workspace during this app session. */
const movedConversations = new Set<string>();

export type EdaWorkspaceResult = {
  /** Workspace every dock conversation runs in ('' = none). */
  workspace: string;
  /** Prompt for a directory and make it the dock's workspace. */
  choose: () => Promise<void>;
};

/**
 * Workspace of the EDA chat dock.
 *
 * The dock has one workspace and every conversation it shows runs there: a new
 * conversation is created inside it, and an existing conversation that carries
 * another binding — including the temporary directory the backend provisions
 * for some assistants — is moved into it once it loads. The pick is stored so it
 * survives restarts.
 */
export const useEdaWorkspace = (conversation: TChatConversation | undefined): EdaWorkspaceResult => {
  const { t } = useTranslation();
  const { mutate } = useSWRConfig();
  const [picked, setPicked] = useState<string>(readEdaWorkspace);
  // The dock's own workspace wins over the conversation's binding: the latter
  // may predate the dock or be a backend-assigned temporary directory.
  const workspace = picked || conversation?.extra?.workspace || '';

  const bindConversation = useCallback(
    async (target: string) => {
      if (!conversation) return;
      const latest = (await getConversationOrNull(conversation.id)) ?? conversation;
      // Only the workspace keys are sent: the backend merges them into `extra`
      // and rejects a full payload because the skills and MCP snapshots recorded
      // at creation are immutable.
      const saved = await ipcBridge.conversation.update.invoke({
        id: conversation.id,
        updates: { extra: { workspace: target, custom_workspace: true } },
      });
      if (!saved) {
        Message.error(t('common.saveFailed'));
        return;
      }

      updateWorkspaceTime(target);
      const nextExtra = {
        ...latest.extra,
        workspace: target,
        custom_workspace: true,
        is_temporary_workspace: false,
      };
      await mutate(`conversation/${conversation.id}`, { ...latest, extra: nextExtra }, { revalidate: false });
      emitter.emit('chat.history.refresh');
    },
    [conversation, mutate, t]
  );

  // Move a conversation created elsewhere (or handed a temporary workspace by
  // the backend) into the dock's workspace. One attempt per conversation keeps
  // a backend that refuses the update from retrying on every revalidation.
  useEffect(() => {
    if (!conversation || !picked || conversation.extra?.workspace === picked) return;
    const key = `${conversation.id}::${picked}`;
    if (movedConversations.has(key)) return;
    movedConversations.add(key);
    bindConversation(picked).catch((error: unknown) => {
      console.error('Failed to bind the EDA chat workspace:', error);
      movedConversations.delete(key);
    });
  }, [bindConversation, conversation, picked]);

  const choose = useCallback(async () => {
    try {
      const files = await ipcBridge.dialog.showOpen.invoke({
        properties: ['openDirectory', 'createDirectory'],
      });
      const path = files?.[0];
      if (!path || path === workspace) return;

      writeEdaWorkspace(path);
      setPicked(path);
      // This conversation is moved explicitly below; do not let the reconcile
      // effect fire a second update for it.
      if (conversation) movedConversations.add(`${conversation.id}::${path}`);
      await bindConversation(path);
    } catch (error) {
      console.error('Failed to bind the EDA chat workspace:', error);
      Message.error(t('common.saveFailed'));
    }
  }, [bindConversation, conversation, t, workspace]);

  return { workspace, choose };
};
