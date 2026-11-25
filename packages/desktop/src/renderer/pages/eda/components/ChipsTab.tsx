/**
 * @license
 * Copyright 2025 BBUI (bbui.dev)
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { Button, Input, Radio, Table, Tag } from '@arco-design/web-react';
import type { TableColumnProps } from '@arco-design/web-react';
import { Code, Cpu, Cube, Play, Right, Search, Speed } from '@icon-park/react';
import MonacoEditor from '@monaco-editor/react';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { MOCK_CHIPS } from '../mockData';
import type { Chip } from '../types';
import { useEda } from '../edaStore';
import { useEditorTheme } from '../hooks/useEditorTheme';
import { Panel, useAskAgent } from './EdaBits';

type SubTab = 'toml' | 'designs' | 'tiles' | 'targets';

type Design = { name: string; kind: string; modules: number; owner: string; status: string };
type Tile = { id: string; core: string; role: string; balls: number; status: string };

const cap = (value: string): string => value.charAt(0).toUpperCase() + value.slice(1);

const chipToml = (chip: Chip): string => `# Buckyball chip configuration
# ${chip.name} — ${chip.description}

[chip]
name = "${chip.name}"
top = "buckyball.${cap(chip.name)}Top"
cores = ${chip.cores}
tiles = ${chip.tiles}
frequency_mhz = ${chip.frequency.replace(' MHz', '')}

[mesh]
kind = "shm"
width = ${Math.ceil(Math.sqrt(chip.tiles))}
banks_per_core = 4
arbitration = "round-robin"
ordering = "enforced"

[memory]
address_space = "0x80000000-0x8fffffff"
coherence = "none"

[trace]
itrace = true
mtrace = true
pmctrace = false
`;

const designsFor = (chip: Chip): Design[] => [
  { name: `${chip.name}-top`, kind: 'chip', modules: chip.tiles * 3 + chip.cores, owner: 'arch', status: 'elaborated' },
  { name: 'mesh_shm', kind: 'noc', modules: chip.tiles, owner: 'arch/framework/root', status: 'verified' },
  { name: 'ball_top', kind: 'accelerator', modules: 5, owner: 'arch/framework/balldomain', status: 'verified' },
  { name: 'mem_domain', kind: 'memory', modules: chip.cores * 2, owner: 'arch/framework/memdomain', status: 'wip' },
];

const tilesFor = (chip: Chip): Tile[] =>
  Array.from({ length: Math.min(chip.tiles, 12) }, (_, index) => ({
    id: `tile_${index}`,
    core: `core_${index % chip.cores}`,
    role: index % 4 === 0 ? 'mesh router' : index % 3 === 0 ? 'memory' : 'ball',
    balls: index % 4 === 0 ? 0 : 1 + (index % 3),
    status: index % 5 === 0 ? 'idle' : 'active',
  }));

const targetsFor = (chip: Chip): string[] => [
  `arch/chip/Top${cap(chip.name)}.scala`,
  'arch/framework/root/MeshShm.scala',
  'arch/framework/root/Arbiter.scala',
  'arch/framework/balldomain/Ball.scala',
  'arch/framework/balldomain/BallISA.scala',
  'arch/framework/memdomain/TLB.scala',
  'arch/framework/system/Tile.scala',
  'arch/framework/system/Chip.scala',
];

const chipStatusColor = (status: Chip['status']): string =>
  status === 'ready' ? 'green' : status === 'wip' ? 'orange' : 'gray';

export const ChipsTab: React.FC = () => {
  const { t } = useTranslation();
  const { state, setChip, setTab, openFile, startRun } = useEda();
  const askAgent = useAskAgent();
  const editorTheme = useEditorTheme();
  const [subTab, setSubTab] = useState<SubTab>('toml');
  const [query, setQuery] = useState('');

  const chip = MOCK_CHIPS.find((item) => item.id === state.chip) ?? MOCK_CHIPS[0];
  const filtered = MOCK_CHIPS.filter((item) => item.name.toLowerCase().includes(query.toLowerCase()));
  const toml = useMemo(() => chipToml(chip), [chip]);
  const designs = useMemo(() => designsFor(chip), [chip]);
  const tiles = useMemo(() => tilesFor(chip), [chip]);
  const targets = useMemo(() => targetsFor(chip), [chip]);

  const openInAdvanced = (path: string): void => {
    openFile(path);
    setTab('advanced');
  };

  const designColumns: TableColumnProps<Design>[] = [
    {
      title: t('eda.chips.design'),
      dataIndex: 'name',
      render: (value: string) => <span className='font-mono text-11px text-t-primary'>{value}</span>,
    },
    {
      title: t('eda.chips.kind'),
      dataIndex: 'kind',
      width: 130,
      render: (value: string) => <span className='text-10px text-t-tertiary'>{value}</span>,
    },
    {
      title: t('eda.chips.modules'),
      dataIndex: 'modules',
      width: 100,
      align: 'right',
      render: (value: number) => <span className='font-mono text-10px text-t-secondary'>{value}</span>,
    },
    {
      title: t('eda.chips.owner'),
      dataIndex: 'owner',
      render: (value: string) => <span className='font-mono text-10px text-t-tertiary'>{value}</span>,
    },
    {
      title: t('eda.chips.status'),
      dataIndex: 'status',
      width: 120,
      align: 'right',
      render: (value: string) => (
        <Tag
          size='small'
          color={value === 'verified' ? 'green' : value === 'wip' ? 'orange' : 'arcoblue'}
          className='m-0! font-mono'
        >
          {value}
        </Tag>
      ),
    },
  ];

  return (
    <div className='flex h-full min-h-0'>
      <aside className='flex w-250px shrink-0 flex-col border-r border-solid border-b-base bg-1'>
        <div className='border-b border-solid border-b-base p-10px'>
          <Input
            allowClear
            size='small'
            value={query}
            onChange={setQuery}
            prefix={<Search size='12' fill='currentColor' className='text-t-disabled' />}
            placeholder={t('eda.chips.filter')}
          />
        </div>

        <div className='min-h-0 flex-1 overflow-y-auto p-6px'>
          {filtered.map((item) => {
            const active = item.id === chip.id;
            return (
              <Button
                key={item.id}
                type='text'
                long
                className={classNames(
                  'mb-2px! flex-col! items-stretch! justify-start! px-10px! py-8px!',
                  active ? 'bg-fill-2!' : ''
                )}
                onClick={() => setChip(item.id)}
              >
                <span className='flex w-full items-center gap-8px'>
                  <span
                    className={classNames(
                      'size-6px shrink-0 rounded-full',
                      item.status === 'ready' ? 'bg-success' : item.status === 'wip' ? 'bg-warning' : 'bg-5'
                    )}
                  />
                  <span
                    className={classNames('truncate font-mono text-11px', active ? 'text-primary' : 'text-t-primary')}
                  >
                    {item.name}
                  </span>
                  <span className='ms-auto font-mono text-9px text-t-disabled'>{item.cores}c</span>
                </span>
                <span className='flex w-full items-center gap-6px ps-14px font-mono text-9px text-t-tertiary'>
                  <span>{item.tiles} tiles</span>
                  <span>·</span>
                  <span>{item.balls} balls</span>
                </span>
              </Button>
            );
          })}
          {filtered.length === 0 ? (
            <p className='m-0 px-8px py-16px text-center text-10px text-t-disabled'>{t('eda.chips.noMatch')}</p>
          ) : null}
        </div>

        <div className='flex items-center justify-between border-t border-solid border-b-base px-10px py-6px text-9px text-t-disabled'>
          <span>{t('eda.chips.count', { count: filtered.length })}</span>
          <span className='font-mono'>examples/chips</span>
        </div>
      </aside>

      <section className='flex min-w-0 flex-1 flex-col'>
        <header className='border-b border-solid border-b-base bg-1 px-20px py-12px'>
          <div className='flex flex-wrap items-start justify-between gap-12px'>
            <div className='min-w-0'>
              <div className='mb-4px flex flex-wrap items-center gap-8px'>
                <Cpu size='14' fill='currentColor' className='text-primary' />
                <h2 className='m-0 font-mono text-18px font-600 text-t-primary'>{chip.name}</h2>
                <Tag size='small' color={chipStatusColor(chip.status)} className='m-0! font-mono uppercase'>
                  {chip.status}
                </Tag>
              </div>
              <p className='m-0 max-w-720px text-11px text-t-tertiary'>{chip.description}</p>
            </div>
            <div className='flex items-center gap-8px'>
              <Button icon={<Code size='11' fill='currentColor' />} onClick={() => openInAdvanced('arch/chip.toml')}>
                {t('eda.chips.openAdvanced')}
              </Button>
              <Button type='primary' icon={<Play size='11' fill='currentColor' />} onClick={() => startRun(chip.id)}>
                {t('eda.actions.runSim')}
              </Button>
            </div>
          </div>

          <div className='mt-12px flex flex-wrap items-center gap-16px text-10px text-t-tertiary'>
            <span className='flex items-center gap-4px'>
              <Cpu size='10' fill='currentColor' /> {t('eda.chips.cores', { count: chip.cores })}
            </span>
            <span className='flex items-center gap-4px'>
              <Cube size='10' fill='currentColor' /> {t('eda.chips.tiles', { count: chip.tiles })}
            </span>
            <span className='flex items-center gap-4px'>
              <Cube size='10' fill='currentColor' /> {t('eda.chips.balls', { count: chip.balls })}
            </span>
            <span className='flex items-center gap-4px'>
              <Speed size='10' fill='currentColor' /> {chip.frequency}
            </span>
            <span className='font-mono'>{chip.process}</span>
          </div>
        </header>

        <div className='flex items-center gap-8px border-b border-solid border-b-base bg-1 px-12px py-6px'>
          <Radio.Group size='small' type='button' value={subTab} onChange={(value) => setSubTab(value as SubTab)}>
            <Radio value='toml'>chip.toml</Radio>
            <Radio value='designs'>{t('eda.chips.designs')}</Radio>
            <Radio value='tiles'>{t('eda.chips.tilesTab')}</Radio>
            <Radio value='targets'>{t('eda.chips.targets')}</Radio>
          </Radio.Group>
          <span className='ms-auto pe-4px font-mono text-9px text-t-disabled'>{chip.id}</span>
        </div>

        <div className='min-h-0 flex-1 bg-base'>
          {subTab === 'toml' ? (
            <MonacoEditor
              height='100%'
              language='ini'
              value={toml}
              theme={editorTheme}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                fontSize: 12,
                lineHeight: 20,
                scrollBeyondLastLine: false,
                renderLineHighlight: 'line',
                padding: { top: 12, bottom: 12 },
                overviewRulerLanes: 0,
                scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
              }}
            />
          ) : null}

          {subTab === 'designs' ? (
            <div className='h-full overflow-y-auto p-16px'>
              <Table
                rowKey='name'
                size='small'
                border={false}
                pagination={false}
                data={designs}
                columns={designColumns}
              />
            </div>
          ) : null}

          {subTab === 'tiles' ? (
            <div className='grid h-full grid-cols-2 gap-12px overflow-y-auto p-16px md:grid-cols-3 xl:grid-cols-4'>
              {tiles.map((tile) => (
                <Panel key={tile.id} className='flex flex-col gap-8px p-12px'>
                  <div className='flex items-center gap-8px'>
                    <Cube size='12' fill='currentColor' className='text-primary' />
                    <span className='font-mono text-11px text-t-primary'>{tile.id}</span>
                    <span
                      className={classNames(
                        'ms-auto size-6px rounded-full',
                        tile.status === 'active' ? 'bg-success' : 'bg-5'
                      )}
                    />
                  </div>
                  <div className='font-mono text-9px text-t-tertiary'>{tile.core}</div>
                  <div className='flex items-center gap-8px text-10px text-t-secondary'>
                    <Tag size='small' className='m-0!'>
                      {tile.role}
                    </Tag>
                    <span className='text-t-disabled'>{t('eda.chips.ballCount', { count: tile.balls })}</span>
                  </div>
                </Panel>
              ))}
            </div>
          ) : null}

          {subTab === 'targets' ? (
            <div className='h-full overflow-y-auto p-16px'>
              <ul className='m-0 flex list-none flex-col gap-2px p-0'>
                {targets.map((path) => (
                  <li key={path}>
                    <Button
                      type='text'
                      long
                      className='h-auto! justify-start! px-8px! py-6px!'
                      onClick={() => openInAdvanced(path)}
                    >
                      <span className='flex w-full items-center gap-8px'>
                        <Code size='11' fill='currentColor' className='text-t-disabled' />
                        <span className='truncate font-mono text-11px text-t-secondary'>{path}</span>
                        <Right size='11' fill='currentColor' className='ms-auto shrink-0 text-t-disabled' />
                      </span>
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className='flex flex-wrap items-center gap-12px border-t border-solid border-b-base bg-1 px-16px py-10px'>
          <span className='text-12px text-t-secondary'>{t('eda.chips.agentHint')}</span>
          <Button
            size='small'
            className='ms-auto'
            onClick={() =>
              askAgent(t('eda.chips.agentPrompt', { chip: chip.name, cores: chip.cores, tiles: chip.tiles }))
            }
          >
            {t('eda.actions.askAgent')}
          </Button>
        </div>
      </section>
    </div>
  );
};
