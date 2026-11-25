/**
 * @license
 * Copyright 2025 BBUI (bbui.dev)
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { Button, Input, Tag } from '@arco-design/web-react';
import { Cube, Play, Refresh, Right, Search, Terminal } from '@icon-park/react';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { STAGE_LABELS, STAGE_TITLES } from '../mockData';
import type { StageKey } from '../types';
import { ballStatus, useEda } from '../edaStore';
import { Panel, StageDot, StagePill, useAskAgent } from './EdaBits';

const statusColor = (value: 'pass' | 'fail' | 'partial'): string =>
  value === 'pass' ? 'green' : value === 'fail' ? 'red' : 'gray';

export const BallsTab: React.FC = () => {
  const { t } = useTranslation();
  const { state, setBall, startRun, rerunFromStage } = useEda();
  const askAgent = useAskAgent();
  const [query, setQuery] = useState('');

  const effectiveId = state.ball ?? state.balls[0]?.id;
  const ball = state.balls.find((item) => item.id === effectiveId) ?? state.balls[0];

  const activeRun = state.runs.find((run) => run.id === state.activeRunId);
  const autoStageKey = ball
    ? (state.runs.find((run) => run.id === state.activeRunId && run.ball === ball.id)?.stageKey ??
      ball.stages.find((stage) => stage.status === 'red' || stage.status === 'running')?.key ??
      ball.stages[0].key)
    : 'contract';

  // A manual stage pick applies to the ball and run it was made in; a new run re-focuses automatically.
  const [picked, setPicked] = useState<{ ballId: string; runId: string | null; stageKey: StageKey } | null>(null);
  const stageKey =
    picked && ball && picked.ballId === ball.id && picked.runId === state.activeRunId ? picked.stageKey : autoStageKey;

  const selectedStage = useMemo(
    () => ball?.stages.find((stage) => stage.key === stageKey) ?? ball?.stages[0],
    [ball, stageKey]
  );

  if (!ball || !selectedStage) {
    return <div className='p-24px text-12px text-t-tertiary'>{t('eda.balls.empty')}</div>;
  }

  const filtered = state.balls.filter((item) => item.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className='flex h-full min-h-0'>
      <aside className='flex w-262px shrink-0 flex-col border-r border-solid border-b-base bg-1'>
        <div className='border-b border-solid border-b-base p-10px'>
          <Input
            allowClear
            size='small'
            value={query}
            onChange={setQuery}
            prefix={<Search size='12' fill='currentColor' className='text-t-disabled' />}
            placeholder={t('eda.balls.filter')}
          />
        </div>

        <div className='min-h-0 flex-1 overflow-y-auto p-6px'>
          {filtered.map((item) => {
            const active = item.id === ball.id;
            const status = ballStatus(item);
            return (
              <Button
                key={item.id}
                type='text'
                long
                className={classNames(
                  'mb-2px! flex-col! items-stretch! justify-start! px-10px! py-8px!',
                  active ? 'bg-fill-2!' : ''
                )}
                onClick={() => setBall(item.id)}
              >
                <span className='flex w-full items-center gap-8px'>
                  <Cube size='12' fill='currentColor' className={active ? 'text-primary' : 'text-t-tertiary'} />
                  <span
                    className={classNames('truncate font-mono text-11px', active ? 'text-primary' : 'text-t-primary')}
                  >
                    {item.name}
                  </span>
                  <Tag size='small' color={statusColor(status)} className='m-0! ms-auto! uppercase'>
                    {status}
                  </Tag>
                </span>
                <span className='flex w-full items-center gap-4px ps-20px'>
                  {item.stages.map((stage) => (
                    <StageDot key={stage.key} status={stage.status} />
                  ))}
                  <span className='ms-auto font-mono text-9px text-t-disabled'>{item.kind}</span>
                </span>
              </Button>
            );
          })}
        </div>

        <div className='flex items-center justify-between border-t border-solid border-b-base px-10px py-6px text-9px text-t-disabled'>
          <span>{t('eda.balls.count', { count: filtered.length })}</span>
          <span className='font-mono'>examples/balls</span>
        </div>
      </aside>

      <section className='flex min-w-0 flex-1 flex-col overflow-y-auto'>
        <header className='border-b border-solid border-b-base bg-1 px-20px py-12px'>
          <div className='flex flex-wrap items-start justify-between gap-12px'>
            <div>
              <div className='mb-4px flex flex-wrap items-center gap-8px'>
                <Cube size='14' fill='currentColor' className='text-primary' />
                <h2 className='m-0 font-mono text-18px font-600 text-t-primary'>{ball.name}</h2>
                <Tag size='small' className='m-0! font-mono'>
                  {ball.kind}
                </Tag>
                <Tag size='small' color={statusColor(ballStatus(ball))} className='m-0! font-mono uppercase'>
                  {ballStatus(ball)}
                </Tag>
              </div>
              <p className='m-0 max-w-680px text-11px text-t-tertiary'>{ball.summary}</p>
            </div>
            <div className='flex items-center gap-8px'>
              <Button
                icon={<Cube size='11' fill='currentColor' />}
                onClick={() => askAgent(t('eda.balls.agentPrompt', { ball: ball.name, stage: selectedStage.key }))}
              >
                {t('eda.actions.askAgent')}
              </Button>
              <Button
                type='primary'
                icon={<Play size='11' fill='currentColor' />}
                onClick={() => startRun(state.chip, ball.id)}
              >
                {t('eda.actions.runGate')}
              </Button>
            </div>
          </div>
        </header>

        <div className='border-b border-solid border-b-base bg-base px-20px py-14px'>
          <div className='mb-8px flex items-center justify-between gap-8px'>
            <span className='text-9px uppercase tracking-wide text-t-disabled'>{t('eda.balls.gateBoard')}</span>
            <span className='flex items-center gap-8px font-mono text-9px text-t-disabled'>
              {activeRun && activeRun.ball === ball.id ? (
                <span className='text-primary'>
                  {activeRun.id} · {activeRun.status}
                </span>
              ) : null}
              <span>
                core={ball.core} · chip={state.chip}
              </span>
            </span>
          </div>

          <div className='flex flex-wrap items-stretch gap-6px'>
            {ball.stages.map((stage, index) => (
              <React.Fragment key={stage.key}>
                <div className='flex min-w-0 flex-1 items-center gap-6px'>
                  <Button
                    type='text'
                    long
                    className={classNames(
                      'h-auto! flex-col! items-stretch! justify-start! rounded-8px! border! border-solid! p-10px!',
                      stage.key === selectedStage.key ? 'border-primary-6! bg-primary-light-1!' : 'border-b-base! bg-1!'
                    )}
                    onClick={() => setPicked({ ballId: ball.id, runId: state.activeRunId, stageKey: stage.key })}
                  >
                    <span className='flex w-full items-center gap-6px'>
                      <StageDot status={stage.status} />
                      <span className='truncate font-mono text-10px text-t-primary'>{stage.key}</span>
                      <Right size='9' fill='currentColor' className='ms-auto shrink-0 text-t-disabled' />
                    </span>
                    <span className='mt-6px w-full truncate text-left text-9px text-t-tertiary'>{stage.metric}</span>
                    <span className='mt-2px w-full font-mono text-9px text-t-disabled'>{stage.duration}</span>
                  </Button>
                </div>
                {index < ball.stages.length - 1 ? (
                  <Right size='14' fill='currentColor' className='shrink-0 self-center text-t-disabled' />
                ) : null}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className='flex min-h-0 flex-1 flex-col p-16px'>
          <div className='mb-8px flex flex-wrap items-center gap-8px'>
            <Terminal size='12' fill='currentColor' className='text-primary' />
            <span className='font-mono text-11px text-t-primary'>
              {STAGE_LABELS[selectedStage.key]} · {STAGE_TITLES[selectedStage.key]}
            </span>
            <StagePill status={selectedStage.status} label={selectedStage.status} />
            <span className='font-mono text-10px text-t-tertiary'>{selectedStage.duration}</span>
            <span className='font-mono text-10px text-t-tertiary'>{selectedStage.metric}</span>
            <div className='ms-auto flex items-center gap-6px'>
              <Button
                size='mini'
                icon={<Refresh size='10' fill='currentColor' />}
                disabled={selectedStage.status === 'running'}
                onClick={() => rerunFromStage(ball.id, selectedStage.key)}
              >
                {t('eda.actions.rerunFrom', { stage: selectedStage.key })}
              </Button>
              <Button
                size='mini'
                type='text'
                onClick={() =>
                  askAgent(
                    t('eda.balls.explainPrompt', {
                      ball: ball.name,
                      stage: selectedStage.key,
                      metric: selectedStage.metric,
                    })
                  )
                }
              >
                {t('eda.actions.explain')}
              </Button>
            </div>
          </div>

          <Panel className='flex min-h-0 flex-1 flex-col overflow-hidden'>
            <div className='flex h-28px shrink-0 items-center gap-8px border-b border-solid border-b-base px-12px font-mono text-9px text-t-disabled'>
              <span>trace · {ball.name}</span>
              <span>·</span>
              <span>stage={selectedStage.key}</span>
              <span className='ms-auto'>{t('eda.common.mockLog')}</span>
            </div>
            <pre className='m-0 min-h-0 flex-1 overflow-auto p-12px font-mono text-11px leading-relaxed text-t-secondary'>
              {selectedStage.log.map((line, index) => (
                <div key={index} className={logLineClass(line)}>
                  <span className='me-12px inline-block w-20px select-none text-right text-t-disabled'>
                    {index + 1}
                  </span>
                  {line}
                </div>
              ))}
              {selectedStage.status === 'gray' ? (
                <div className='mt-8px text-10px text-t-disabled'>{t('eda.balls.grayHint')}</div>
              ) : null}
              {selectedStage.status === 'red' ? (
                <div className='mt-8px text-10px text-danger'>{t('eda.balls.redHint')}</div>
              ) : null}
            </pre>
          </Panel>
        </div>
      </section>
    </div>
  );
};

const logLineClass = (line: string): string | undefined => {
  if (/error|fail|assert|collision|aborted/i.test(line)) return 'text-danger';
  if (/suggested|warning|stalled/i.test(line)) return 'text-warning';
  if (/pass|ok|complete|match|ready/i.test(line)) return 'text-success';
  return undefined;
};
