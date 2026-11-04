/**
 * @license
 * Copyright 2025 BBUI (bbui.dev)
 * SPDX-License-Identifier: Apache-2.0
 *
 * BbrsChat must inject the conversation detail's `fork_capability` into
 * ConversationContext — that context value is the only thing gating the
 * shared message fork button (see MessageText + isForkEnabled). A dropped
 * prop silently hides the fork entry point for every bbrs conversation,
 * which is exactly the bug this guards against.
 */

import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Probe replaces the heavy MessageList: it renders whatever forkCapability
// value reaches ConversationContext, so assertions read the real context.
vi.mock('@renderer/pages/conversation/Messages/MessageList', async () => {
  const { useConversationContextSafe } = await import('@/renderer/hooks/context/ConversationContext');
  const ReactModule = await import('react');
  const Probe: React.FC<Record<string, unknown>> = () => {
    const ctx = useConversationContextSafe();
    return ReactModule.createElement(
      'div',
      { 'data-testid': 'fork-capability-probe' },
      JSON.stringify(ctx?.forkCapability ?? null)
    );
  };
  return { __esModule: true, default: Probe };
});

vi.mock('@renderer/pages/conversation/platforms/bbrs/BbrsSendBox', () => ({
  __esModule: true,
  default: () => null,
}));

// This test is about ConversationContext wiring only; the plan bar pulls in the
// message list + runtime view, neither of which this file's narrow mocks provide.
vi.mock('@renderer/pages/conversation/PlanBar/ConversationPlanBar', () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock('@renderer/pages/conversation/PlanBar/usePlanRecovery', () => ({
  __esModule: true,
  usePlanRecovery: () => {},
}));

vi.mock('@renderer/pages/conversation/Messages/hooks', () => {
  const PassThrough: React.FC<{ children?: React.ReactNode }> = ({ children }) => <>{children}</>;
  return {
    __esModule: true,
    useMessageLstCache: () => {},
    MessageListProvider: PassThrough,
    MessageListLoadingProvider: PassThrough,
    MessagePaginationProvider: PassThrough,
  };
});

vi.mock('@renderer/pages/conversation/Messages/usePendingConfirmationsRecovery', () => ({
  __esModule: true,
  usePendingConfirmationsRecovery: () => {},
}));

vi.mock('@renderer/pages/conversation/Messages/artifacts', () => ({
  __esModule: true,
  ConversationArtifactProvider: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

import BbrsChat from '@renderer/pages/conversation/platforms/bbrs/BbrsChat';
import type { BbrsModelSelection } from '@renderer/pages/conversation/platforms/bbrs/useBbrsModelSelection';

const renderChat = (forkCapability?: { at_turn: boolean }) =>
  render(
    <BbrsChat
      conversation_id='conv-bbrs-1'
      workspace='/workspace/demo'
      modelSelection={{} as BbrsModelSelection}
      forkCapability={forkCapability}
    />
  );

afterEach(cleanup);

describe('BbrsChat fork capability wiring', () => {
  it('exposes the fork capability from the conversation detail to the message context', () => {
    renderChat({ at_turn: false });
    expect(screen.getByTestId('fork-capability-probe').textContent).toBe('{"at_turn":false}');
  });

  it('leaves the context without a capability when the detail declares none, keeping fork hidden', () => {
    renderChat(undefined);
    expect(screen.getByTestId('fork-capability-probe').textContent).toBe('null');
  });
});
