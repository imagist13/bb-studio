/**
 * @license
 * Copyright 2025 BBUI (bbui.dev)
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'vitest';
import { ballStatus, edaTabFromPath, edaTabPath, isEdaTab } from '@/renderer/pages/eda/edaStore';
import type { Ball, BallStage, StageKey, StageStatus } from '@/renderer/pages/eda/types';

const stage = (key: StageKey, status: StageStatus): BallStage => ({
  key,
  status,
  duration: '1.0s',
  metric: 'ok',
  log: [],
});

const ball = (...statuses: StageStatus[]): Ball => ({
  id: 'ball_test',
  name: 'test_ball',
  core: 'toy',
  summary: 'test ball',
  kind: 'matmul',
  stages: (['contract', 'cbemu', 'compiler', 'rtl', 'ppauvm'] as StageKey[]).map((key, index) =>
    stage(key, statuses[index] ?? 'gray')
  ),
});

describe('eda tab routing', () => {
  it('reads the section from the workspace URL', () => {
    expect(edaTabFromPath('/eda/chips')).toBe('chips');
    expect(edaTabFromPath('/eda/waveforms')).toBe('waveforms');
  });

  it('falls back to overview for the bare workspace route', () => {
    expect(edaTabFromPath('/eda')).toBe('overview');
    expect(edaTabFromPath('/eda/unknown')).toBe('overview');
  });

  it('only accepts known sections', () => {
    expect(isEdaTab('advanced')).toBe(true);
    expect(isEdaTab('settings')).toBe(false);
    expect(isEdaTab(undefined)).toBe(false);
  });

  it('builds a stable path for each section', () => {
    expect(edaTabPath('balls')).toBe('/eda/balls');
  });
});

describe('ballStatus', () => {
  it('passes only when every stage is green', () => {
    expect(ballStatus(ball('green', 'green', 'green', 'green', 'green'))).toBe('pass');
  });

  it('fails as soon as one stage is red, even if a later stage is green', () => {
    expect(ballStatus(ball('green', 'green', 'red', 'green', 'green'))).toBe('fail');
  });

  it('is partial while a stage is running', () => {
    expect(ballStatus(ball('green', 'green', 'running', 'gray', 'gray'))).toBe('partial');
  });

  it('is partial when a stage is still blocked', () => {
    expect(ballStatus(ball('green', 'green', 'gray', 'gray', 'gray'))).toBe('partial');
  });
});
