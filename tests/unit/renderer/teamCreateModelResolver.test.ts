/**
 * @license
 * Copyright 2025 BBUI (bbui.dev)
 * SPDX-License-Identifier: Apache-2.0
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const getAssistantMock = vi.fn();
const listProvidersMock = vi.fn();

vi.mock('@/common', () => ({
  ipcBridge: {
    assistants: {
      get: {
        invoke: (...args: unknown[]) => getAssistantMock(...args),
      },
    },
    mode: {
      listProviders: {
        invoke: (...args: unknown[]) => listProvidersMock(...args),
      },
    },
  },
}));

import { resolveDefaultTeamAgentModel } from '@/renderer/pages/team/components/teamCreateModelResolver';
import { TeamModelUnavailableError } from '@/renderer/pages/conversation/utils/conversationCreateError';

describe('resolveDefaultTeamAgentModel', () => {
  beforeEach(() => {
    getAssistantMock.mockReset();
    listProvidersMock.mockReset();
  });

  it('prefers the assistant fixed default model over agent-level fallbacks', async () => {
    getAssistantMock.mockResolvedValue({
      defaults: {
        model: { mode: 'fixed', value: 'claude-sonnet-4-5-20250514' },
      },
      preferences: {
        last_model_id: 'claude-opus-4-1-20250805',
      },
    });

    await expect(
      resolveDefaultTeamAgentModel({
        assistant_id: 'assistant-fixed',
      })
    ).resolves.toBe('claude-sonnet-4-5-20250514');
  });

  it('uses the assistant remembered auto model before falling back to backend defaults', async () => {
    getAssistantMock.mockResolvedValue({
      defaults: {
        model: { mode: 'auto' },
      },
      preferences: {
        last_model_id: 'gemini-2.5-pro',
      },
    });

    await expect(
      resolveDefaultTeamAgentModel({
        assistant_id: 'assistant-auto',
      })
    ).resolves.toBe('gemini-2.5-pro');
  });

  it('falls back to the assistant engine backend when no assistant-owned model is stored', async () => {
    getAssistantMock.mockResolvedValue({
      defaults: {
        model: { mode: 'auto' },
      },
      preferences: {
        last_model_id: undefined,
      },
      engine: {
        agent_id: 'cc126dd5',
        agent: {
          id: 'cc126dd5',
          type: 'acp',
          source: 'builtin',
          acp_backend: 'gemini',
        },
      },
    });

    await expect(
      resolveDefaultTeamAgentModel({
        assistant_id: 'assistant-gemini',
      })
    ).resolves.toBe('auto');
  });

  it('uses the provided assistant backend when detail lookup fails', async () => {
    getAssistantMock.mockRejectedValue(new Error('lookup failed'));

    await expect(
      resolveDefaultTeamAgentModel({
        assistant_id: 'assistant-gemini',
        assistant_backend: 'gemini',
      })
    ).resolves.toBe('auto');
  });

  it('returns an empty model for antigravity assistants resolved from engine details', async () => {
    getAssistantMock.mockResolvedValue({
      defaults: {
        model: { mode: 'auto' },
      },
      preferences: {
        last_model_id: undefined,
      },
      engine: {
        agent_id: 'agy-agent',
        agent: {
          id: 'agy-agent',
          type: 'acp',
          source: 'builtin',
          acp_backend: 'antigravity',
        },
      },
    });

    await expect(
      resolveDefaultTeamAgentModel({
        assistant_id: 'assistant-antigravity',
      })
    ).resolves.toBe('');
  });

  it('returns an empty model for the antigravity backend when detail lookup fails', async () => {
    getAssistantMock.mockRejectedValue(new Error('lookup failed'));

    await expect(
      resolveDefaultTeamAgentModel({
        assistant_id: 'assistant-antigravity',
        assistant_backend: 'antigravity',
      })
    ).resolves.toBe('');
  });

  it('resolves a bbrs assistant to the first model an enabled provider offers', async () => {
    listProvidersMock.mockResolvedValue([
      { id: 'google', platform: 'gemini-with-google-auth', models: ['gemini-2.5-pro'], enabled: true },
      { id: 'disabled', platform: 'openai', models: ['gpt-5.4'], enabled: false },
      { id: 'prov-1', platform: 'openai', models: ['gpt-4o', 'gpt-5.4'], enabled: true },
    ]);

    await expect(
      resolveDefaultTeamAgentModel({
        assistant_backend: 'bbrs',
      })
    ).resolves.toBe('gpt-4o');

    expect(listProvidersMock).toHaveBeenCalledTimes(1);
  });

  it('skips models the user disabled or that cannot carry a conversation', async () => {
    listProvidersMock.mockResolvedValue([
      {
        id: 'prov-1',
        platform: 'openai',
        models: ['dall-e-3', 'gpt-4o'],
        enabled: true,
        model_enabled: { 'gpt-4o': false },
      },
      { id: 'prov-2', platform: 'anthropic', models: ['claude-sonnet-4-5-20250514'], enabled: true },
    ]);

    await expect(
      resolveDefaultTeamAgentModel({
        assistant_backend: 'bbrs',
      })
    ).resolves.toBe('claude-sonnet-4-5-20250514');
  });

  it('rejects with an actionable error when no provider offers a bbrs model', async () => {
    listProvidersMock.mockResolvedValue([]);

    const result = resolveDefaultTeamAgentModel({
      assistant_backend: 'bbrs',
    });

    await expect(result).rejects.toBeInstanceOf(TeamModelUnavailableError);
    await expect(result).rejects.toMatchObject({ code: 'TEAM_MODEL_UNAVAILABLE' });
  });

  it('keeps the default placeholder for other ACP backends such as claude', async () => {
    await expect(
      resolveDefaultTeamAgentModel({
        assistant_backend: 'claude',
      })
    ).resolves.toBe('default');
  });
});
