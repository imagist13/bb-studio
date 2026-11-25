/**
 * @license
 * Copyright 2025 BBUI (bbui.dev)
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { Button, Card, Drawer, Table } from '@arco-design/web-react';
import type { TableColumnProps } from '@arco-design/web-react';
import { ChartLine, Play, Right } from '@icon-park/react';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { MOCK_CHIPS } from '../mockData';
import type { Ball, Run } from '../types';
import { ballStatus, useEda } from '../edaStore';
import { Panel, RunStatusTag, SectionLabel, StageDot, useAskAgent } from './EdaBits';

const STAGE_COLUMNS = ['contract', 'cbemu', 'compiler', 'rtl', 'ppauvm'] as const;

export const OverviewTab: React.FC = () => {
  const { t } = useTranslation();
  const { state, setTab, setBall, setActiveRun } = useEda();
  const askAgent = useAskAgent();
  const [drawerRunId, setDrawerRunId] = useState<string | null>(null);

  const running = state.runs.filter((run) => run.status === 'running');
  const recent = state.runs.filter((run) => run.status !== 'running' && run.status !== 'queued');
  const greenBalls = state.balls.filter((ball) => ball.stages.every((stage) => stage.status === 'green'));
  const passRate = state.balls.length > 0 ? Math.round((greenBalls.length / state.balls.length) * 100) : 0;
  const failingBalls = state.balls.filter((ball) => ballStatus(ball) === 'fail');
  const failedRuns = state.runs.filter((run) => run.status === 'failed');
  const drawerRun = state.runs.find((run) => run.id === drawerRunId) ?? null;

  const openRun = (run: Run): void => {
    setActiveRun(run.id);
    setDrawerRunId(run.id);
  };

  const columns = useMemo<TableColumnProps<Ball>[]>(() => {
    const stageColumns: TableColumnProps<Ball>[] = STAGE_COLUMNS.map((key) => ({
      title: key,
      dataIndex: key,
      width: 76,
      align: 'center',
      render: (_: unknown, record: Ball) => {
        const stage = record.stages.find((item) => item.key === key);
        return stage ? <StageDot status={stage.status} /> : null;
      },
    }));
    return [
      {
        title: t('eda.common.ball'),
        dataIndex: 'name',
        width: 180,
        render: (value: string) => <span className='font-mono text-12px text-t-primary'>{value}</span>,
      },
      {
        title: t('eda.common.core'),
        dataIndex: 'core',
        width: 100,
        render: (value: string) => <span className='font-mono text-11px text-t-tertiary'>{value}</span>,
      },
      ...stageColumns,
      {
        title: t('eda.common.kind'),
        dataIndex: 'kind',
        width: 140,
        render: (value: string) => <span className='text-11px text-t-tertiary'>{value}</span>,
      },
    ];
  }, [t]);

  return (
    <div className='h-full overflow-y-auto'>
      <div className='mx-auto box-border flex w-full max-w-1180px flex-col gap-16px px-16px py-16px md:px-28px'>
        <div className='grid grid-cols-2 gap-12px lg:grid-cols-4'>
          <StatCard
            label={t('eda.overview.stats.chips')}
            value={String(MOCK_CHIPS.length)}
            hint='toy / pebble / goban'
          />
          <StatCard label={t('eda.overview.stats.balls')} value={String(state.balls.length)} hint='5-stage gate' />
          <StatCard
            label={t('eda.overview.stats.running')}
            value={String(running.length)}
            hint={`${running.length} ${t('eda.overview.jobs.streaming')}`}
            tone='primary'
          />
          <StatCard
            label={t('eda.overview.stats.passRate')}
            value={`${passRate}%`}
            hint={`${greenBalls.length}/${state.balls.length} green`}
            tone='success'
          />
        </div>

        {failingBalls.length > 0 || failedRuns.length > 0 ? (
          <Panel className='p-16px'>
            <SectionLabel right={<span className='font-mono'>{failingBalls.length + failedRuns.length}</span>}>
              {t('eda.overview.needsYou')}
            </SectionLabel>
            <div className='flex flex-col gap-4px'>
              {failingBalls.map((ball) => {
                const red = ball.stages.find((stage) => stage.status === 'red');
                return (
                  <div
                    key={ball.id}
                    className='flex items-center gap-8px rounded-8px px-8px py-6px transition-colors hover:bg-fill-2'
                  >
                    <StageDot status='red' />
                    <span className='font-mono text-12px text-t-primary'>{ball.name}</span>
                    <span className='text-11px text-t-tertiary'>
                      {t('eda.overview.blockedAt', { stage: red?.key ?? 'unknown' })}
                    </span>
                    <Button
                      size='mini'
                      type='text'
                      className='ms-auto'
                      onClick={() => {
                        setBall(ball.id);
                        setTab('balls');
                      }}
                    >
                      {t('eda.common.open')}
                    </Button>
                  </div>
                );
              })}
              {failedRuns.map((run) => (
                <div
                  key={run.id}
                  className='flex items-center gap-8px rounded-8px px-8px py-6px transition-colors hover:bg-fill-2'
                >
                  <StageDot status='red' />
                  <span className='font-mono text-12px text-t-primary'>{run.id}</span>
                  <span className='min-w-0 flex-1 truncate text-11px text-t-tertiary'>{run.command}</span>
                  <Button size='mini' type='text' onClick={() => openRun(run)}>
                    {t('eda.common.open')}
                  </Button>
                </div>
              ))}
            </div>
          </Panel>
        ) : null}

        <Panel className='p-16px'>
          <SectionLabel
            right={
              <span className='flex items-center gap-4px font-mono text-10px text-t-disabled'>
                <ChartLine size='11' fill='currentColor' />
                {t('eda.common.mock')}
              </span>
            }
          >
            {t('eda.overview.activeJobs')}
          </SectionLabel>
          {running.length === 0 ? (
            <p className='m-0 text-11px text-t-tertiary'>{t('eda.overview.noActiveJobs')}</p>
          ) : (
            <ul className='m-0 flex list-none flex-col gap-8px p-0'>
              {running.map((run) => (
                <li key={run.id}>
                  <Card
                    hoverable
                    className={classNames(
                      'cursor-pointer',
                      run.id === state.activeRunId ? 'border-primary-6!' : 'border-b-base!'
                    )}
                    bodyStyle={{ padding: '10px 12px' }}
                    onClick={() => openRun(run)}
                  >
                    <div className='flex items-center gap-8px'>
                      <span className='size-6px animate-pulse rounded-full bg-primary' />
                      <span className='min-w-0 flex-1 truncate font-mono text-11px text-t-primary'>{run.command}</span>
                      <span className='font-mono text-10px text-t-tertiary'>{run.duration}</span>
                      <Right size='12' fill='currentColor' className='text-t-disabled' />
                    </div>
                    <div className='mt-8px flex items-center gap-8px'>
                      <div className='h-4px flex-1 overflow-hidden rounded-99px bg-fill-3'>
                        <div className='h-full rounded-99px bg-primary' style={{ width: `${run.progress}%` }} />
                      </div>
                      <span className='w-32px text-right font-mono text-10px text-t-tertiary'>{run.progress}%</span>
                    </div>
                    <div className='mt-6px flex items-center gap-8px font-mono text-9px text-t-disabled'>
                      <span>{run.id}</span>
                      <span>·</span>
                      <span>chip={run.chip}</span>
                      <span>·</span>
                      <span>{run.traceId}</span>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          )}

          {recent.length > 0 ? (
            <div className='mt-12px border-t border-solid border-b-base pt-12px'>
              <div className='mb-6px text-9px uppercase tracking-wide text-t-disabled'>{t('eda.overview.recent')}</div>
              <ul className='m-0 flex list-none flex-col gap-2px p-0'>
                {recent.map((run) => (
                  <li key={run.id}>
                    <Button
                      type='text'
                      long
                      className='h-auto! justify-start! px-6px! py-4px!'
                      onClick={() => openRun(run)}
                    >
                      <span className='flex w-full items-center gap-8px text-left'>
                        <StageDot status={run.status === 'success' ? 'green' : 'red'} />
                        <span className='w-76px shrink-0 font-mono text-10px text-t-tertiary'>{run.id}</span>
                        <span className='truncate text-11px text-t-secondary'>{run.command}</span>
                        <span className='ms-auto shrink-0 font-mono text-9px text-t-disabled'>{run.startedAt}</span>
                      </span>
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Panel>

        <Panel className='p-16px'>
          <SectionLabel
            right={
              <Button size='mini' type='text' onClick={() => setTab('balls')}>
                {t('eda.overview.allBalls')} <Right size='10' fill='currentColor' />
              </Button>
            }
          >
            {t('eda.overview.ballStageOverview')}
          </SectionLabel>
          <Table
            rowKey='id'
            size='small'
            border={false}
            pagination={false}
            data={state.balls}
            columns={columns}
            onRow={(record) => ({
              onClick: () => {
                setBall(record.id);
                setTab('balls');
              },
              style: { cursor: 'pointer' },
            })}
          />
          <div className='mt-10px flex flex-wrap items-center gap-12px text-9px text-t-disabled'>
            <span className='flex items-center gap-4px'>
              <StageDot status='green' /> {t('eda.overview.legend.pass')}
            </span>
            <span className='flex items-center gap-4px'>
              <StageDot status='red' /> {t('eda.overview.legend.failed')}
            </span>
            <span className='flex items-center gap-4px'>
              <StageDot status='gray' /> {t('eda.overview.legend.blocked')}
            </span>
          </div>
        </Panel>

        <Panel className='flex flex-wrap items-center gap-12px p-16px'>
          <Play size='16' fill='currentColor' className='text-primary' />
          <span className='text-12px text-t-secondary'>{t('eda.overview.agentHint')}</span>
          <Button
            className='ms-auto'
            size='small'
            type='primary'
            onClick={() => askAgent(t('eda.overview.agentPrompt', { chip: state.chip }))}
          >
            {t('eda.actions.askAgent')}
          </Button>
        </Panel>
      </div>

      <Drawer
        width={760}
        visible={Boolean(drawerRun)}
        onCancel={() => setDrawerRunId(null)}
        title={
          drawerRun ? (
            <span className='flex items-center gap-8px'>
              <span className='font-mono'>{drawerRun.id}</span>
              <RunStatusTag status={drawerRun.status} />
            </span>
          ) : null
        }
        footer={null}
      >
        {drawerRun ? (
          <div className='flex flex-col gap-12px'>
            <div className='flex flex-wrap items-center gap-12px font-mono text-10px text-t-tertiary'>
              <span>chip={drawerRun.chip}</span>
              <span>trace={drawerRun.traceId}</span>
              <span>commit={drawerRun.commit}</span>
              <span>elapsed={drawerRun.duration}</span>
            </div>
            <pre className='m-0 max-h-[60vh] overflow-auto rounded-8px border border-solid border-b-base bg-base p-12px font-mono text-11px leading-relaxed text-t-secondary'>
              {drawerRun.log.map((line, index) => {
                const danger = /error|fail|abort|assert/i.test(line);
                const success = /pass|ok|finished/i.test(line);
                return (
                  <div key={index} className={danger ? 'text-danger' : success ? 'text-success' : undefined}>
                    <span className='me-12px inline-block w-18px select-none text-right text-t-disabled'>
                      {index + 1}
                    </span>
                    {line}
                  </div>
                );
              })}
            </pre>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
};

const StatCard: React.FC<{
  label: string;
  value: string;
  hint: string;
  tone?: 'primary' | 'success';
}> = ({ label, value, hint, tone }) => (
  <div className='rounded-12px border border-solid border-b-base bg-1 p-14px'>
    <div className='text-10px uppercase tracking-wide text-t-tertiary'>{label}</div>
    <div
      className={classNames(
        'mt-6px font-mono text-22px leading-none',
        tone === 'primary' ? 'text-primary' : tone === 'success' ? 'text-success' : 'text-t-primary'
      )}
    >
      {value}
    </div>
    <div className='mt-6px truncate text-10px text-t-disabled'>{hint}</div>
  </div>
);
