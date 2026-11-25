/**
 * @license
 * Copyright 2025 BBUI (bbui.dev)
 * SPDX-License-Identifier: Apache-2.0
 */

import { Button, Spin, Tooltip } from '@arco-design/web-react';
import { ArrowRightUp, Close, FolderOpen, MessageOne, Plus } from '@icon-park/react';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import ChatConversation from '@renderer/pages/conversation/components/ChatConversation';
import { requestConversationSendBoxPrefill } from '@renderer/hooks/chat/useSendBoxDraft';
import { consumeEdaChatPrompt, useEdaChatState } from '../edaChatStore';
import { useEdaConversation } from '../hooks/useEdaConversation';
import { useEdaWorkspace } from '../hooks/useEdaWorkspace';
import { edaWorkspaceLabel } from '../utils/edaWorkspace';

type EdaChatPanelProps = {
  /** Closes the dock; omitted when the panel is the whole page. */
  onClose?: () => void;
};

/**
 * Content of the EDA chat dock: a workspace bar plus the ordinary conversation
 * surface.
 *
 * Every conversation the dock uses runs in the dock's workspace, shown on the
 * left of the bar — the chip repository the workbench is about, not a temporary
 * directory. The conversation is created through the same API and with the same
 * default assistant/model as the Guid page; everything below the bar is the
 * existing chat implementation, unchanged, so sending, streaming and history
 * behave exactly like the chat page.
 */
export const EdaChatPanel: React.FC<EdaChatPanelProps> = ({ onClose }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { conversation, state: conversationState, failure, retry, startNew } = useEdaConversation();
  const { workspace, choose } = useEdaWorkspace(conversation);
  const { pendingPrompt } = useEdaChatState();

  // Prompts queued by "Ask agent" buttons land in this conversation's send box
  // (queued by the prefill channel until the box mounts).
  useEffect(() => {
    if (!conversation || !pendingPrompt) return;
    const prompt = consumeEdaChatPrompt();
    if (prompt) requestConversationSendBoxPrefill(conversation.id, prompt);
  }, [conversation, pendingPrompt]);

  const workspaceText = workspace ? edaWorkspaceLabel(workspace) : t('eda.chat.workspace');

  return (
    <div className='flex h-full min-h-0 flex-col bg-base'>
      <div className='flex shrink-0 items-center gap-2px border-b border-solid border-b-base px-6px py-4px'>
        <Tooltip content={workspace || t('eda.chat.workspaceUnset')}>
          <Button
            size='mini'
            type='text'
            className='max-w-190px shrink-0'
            icon={<FolderOpen size='13' fill='currentColor' />}
            onClick={() => {
              void choose();
            }}
          >
            {/* Inline-block, not block: an Arco button is `display: inline-block`
                with a fixed height, so a block child would break onto a second
                line inside the 24px button and paint over the chat header. */}
            <span className='inline-block max-w-150px truncate align-middle text-11px'>{workspaceText}</span>
          </Button>
        </Tooltip>
        <div className='min-w-0 flex-1' />
        <Tooltip content={t('eda.chat.newChat')}>
          <Button
            size='mini'
            type='text'
            className='shrink-0'
            icon={<Plus size='13' fill='currentColor' />}
            aria-label={t('eda.chat.newChat')}
            disabled={!conversation}
            onClick={startNew}
          />
        </Tooltip>
        {conversation ? (
          <Tooltip content={t('eda.chat.openInChat')}>
            <Button
              size='mini'
              type='text'
              className='shrink-0'
              icon={<ArrowRightUp size='13' fill='currentColor' />}
              aria-label={t('eda.chat.openInChat')}
              onClick={() => {
                void navigate(`/conversation/${conversation.id}`);
              }}
            />
          </Tooltip>
        ) : null}
        {onClose ? (
          <Tooltip content={t('eda.chat.close')}>
            <Button
              size='mini'
              type='text'
              className='shrink-0'
              icon={<Close size='13' fill='currentColor' />}
              aria-label={t('eda.chat.close')}
              onClick={onClose}
            />
          </Tooltip>
        ) : null}
      </div>

      <div className='min-h-0 flex-1 overflow-hidden'>
        {conversation ? (
          <ChatConversation conversation={conversation} compactHeader />
        ) : (
          <div className='flex h-full flex-col items-center justify-center gap-12px px-24px text-center'>
            {conversationState === 'failed' ? (
              <>
                <MessageOne theme='outline' size='28' fill='currentColor' className='text-t-tertiary' />
                <span className='text-14px text-t-secondary'>
                  {failure === 'no_model' ? t('conversation.noModelConfigured') : t('conversation.createFailed')}
                </span>
                {failure !== 'no_model' && (
                  <Button size='small' onClick={retry}>
                    {t('common.retry')}
                  </Button>
                )}
              </>
            ) : (
              <Spin loading />
            )}
          </div>
        )}
      </div>
    </div>
  );
};
