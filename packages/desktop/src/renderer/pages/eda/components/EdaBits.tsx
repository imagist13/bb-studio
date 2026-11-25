/**
 * @license
 * Copyright 2025 BBUI (bbui.dev)
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback } from 'react';
import { Tag } from '@arco-design/web-react';
import classNames from 'classnames';
import { requestEdaChatPrompt } from '../edaChatStore';
import type { Run, StageStatus } from '../types';

export const stageToneClass = (status: StageStatus): string => {
  if (status === 'green') return 'bg-success';
  if (status === 'red') return 'bg-danger';
  if (status === 'running') return 'bg-primary animate-pulse';
  return 'bg-[var(--bg-5)]';
};

export const StageDot: React.FC<{ status: StageStatus; size?: number; className?: string }> = ({
  status,
  size = 6,
  className,
}) => (
  <span
    className={classNames('inline-block shrink-0 rounded-full', stageToneClass(status), className)}
    style={{ width: size, height: size }}
  />
);

const stageTagColor = (status: StageStatus): string => {
  if (status === 'green') return 'green';
  if (status === 'red') return 'red';
  if (status === 'running') return 'arcoblue';
  return 'gray';
};

export const StagePill: React.FC<{ status: StageStatus; label: string }> = ({ status, label }) => (
  <Tag size='small' color={stageTagColor(status)} className='m-0! font-mono'>
    {label}
  </Tag>
);

export const RunStatusTag: React.FC<{ status: Run['status'] }> = ({ status }) => {
  const color =
    status === 'running' ? 'arcoblue' : status === 'success' ? 'green' : status === 'failed' ? 'red' : 'gray';
  return (
    <Tag size='small' color={color} className='!m-0 font-mono uppercase'>
      {status}
    </Tag>
  );
};

export const Panel: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={classNames('rounded-12px border border-solid border-b-base bg-1', className)}>{children}</div>
);

export const SectionLabel: React.FC<{ children: React.ReactNode; right?: React.ReactNode }> = ({ children, right }) => (
  <div className='mb-10px flex items-center gap-8px'>
    <span className='text-12px font-600 text-t-primary'>{children}</span>
    {right ? <span className='ms-auto text-11px text-t-tertiary'>{right}</span> : null}
  </div>
);

/**
 * Hand the EDA context to the dock's agent chat as a prompt.
 *
 * The dock opens if it was collapsed and the prompt lands in its send box, so
 * the user keeps the workbench on screen and presses send when ready.
 */
export const useAskAgent = (): ((prompt: string) => void) =>
  useCallback((prompt: string) => {
    requestEdaChatPrompt(prompt);
  }, []);
