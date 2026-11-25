/**
 * @license
 * Copyright 2025 BBUI (bbui.dev)
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useRef, useState } from 'react';
import { Button, Tag, Tooltip } from '@arco-design/web-react';
import { Aiming, Minus, Plus, PreviewCloseOne, PreviewOpen, Waves, ZoomIn } from '@icon-park/react';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { MOCK_WAVEFORMS } from '../mockData';
import type { WaveFile, WaveSignal } from '../types';
import { useEda } from '../edaStore';
import { useAskAgent } from './EdaBits';

const LABEL_W = 172;
const LANE_H = 36;
const RULER_H = 26;
const ZOOMS = [5, 8, 12, 18] as const;

const valueAt = (signal: WaveSignal, t: number): string => {
  let value = signal.transitions[0]?.value ?? '0';
  for (const transition of signal.transitions) {
    if (transition.t <= t) value = transition.value;
    else break;
  }
  return value;
};

export const WaveformsTab: React.FC = () => {
  const { t } = useTranslation();
  const { state, setWaveformId } = useEda();
  const askAgent = useAskAgent();

  const file = MOCK_WAVEFORMS.find((item) => item.id === state.waveformId) ?? MOCK_WAVEFORMS[0];
  const [zoom, setZoom] = useState<number>(8);
  const [cursorT, setCursorT] = useState<number | null>(null);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  const plotWidth = file.span * zoom;
  const svgWidth = Math.max(plotWidth, 480);
  const svgHeight = RULER_H + file.signals.length * LANE_H;
  const cursor = cursorT ?? Math.round(file.span / 2);
  const transitionCount = file.signals.reduce((total, signal) => total + signal.transitions.length, 0);

  const zoomBy = (delta: number): void => {
    const index = ZOOMS.indexOf(zoom as (typeof ZOOMS)[number]);
    const nextIndex = Math.min(ZOOMS.length - 1, Math.max(0, (index < 0 ? 1 : index) + delta));
    setZoom(ZOOMS[nextIndex]);
  };

  const fitToWindow = (): void => {
    const element = scrollRef.current;
    if (element) setZoom(Math.max(2, Math.floor((element.clientWidth - 8) / file.span)));
  };

  const toggleSignal = (name: string): void => {
    setHidden((previous) => {
      const next = new Set(previous);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  return (
    <div className='flex h-full min-h-0'>
      <aside className='flex w-248px shrink-0 flex-col border-r border-solid border-b-base bg-1'>
        <div className='flex items-center justify-between border-b border-solid border-b-base px-12px py-8px'>
          <span className='text-9px uppercase tracking-wide text-t-disabled'>{t('eda.waveforms.files')}</span>
          <Tag size='small' className='m-0! font-mono'>
            {MOCK_WAVEFORMS.length}
          </Tag>
        </div>
        <div className='min-h-0 flex-1 overflow-y-auto p-6px'>
          {MOCK_WAVEFORMS.map((item) => {
            const active = item.id === file.id;
            return (
              <Button
                key={item.id}
                type='text'
                long
                className={classNames(
                  'mb-2px! flex-col! items-stretch! justify-start! px-10px! py-8px!',
                  active ? 'bg-fill-2!' : ''
                )}
                onClick={() => {
                  setWaveformId(item.id);
                  setCursorT(null);
                }}
              >
                <span className='flex w-full items-center gap-6px'>
                  <Waves size='12' fill='currentColor' className={active ? 'text-primary' : 'text-t-tertiary'} />
                  <span className='truncate font-mono text-10px text-t-primary'>{item.name}</span>
                </span>
                <span className='flex w-full items-center gap-8px ps-18px font-mono text-9px text-t-tertiary'>
                  <Tag
                    size='small'
                    color={item.format === 'fst' ? 'arcoblue' : 'gray'}
                    className='m-0! font-mono uppercase'
                  >
                    {item.format}
                  </Tag>
                  <span>{item.size}</span>
                  <span className='ms-auto text-t-disabled'>{item.createdAt}</span>
                </span>
              </Button>
            );
          })}
        </div>
        <div className='border-t border-solid border-b-base px-10px py-6px font-mono text-9px text-t-disabled'>
          trace/ · mock vcd/fst
        </div>
      </aside>

      <section className='flex min-w-0 flex-1 flex-col'>
        <header className='flex flex-wrap items-center gap-8px border-b border-solid border-b-base bg-1 px-16px py-10px'>
          <Waves size='14' fill='currentColor' className='text-primary' />
          <span className='font-mono text-12px text-t-primary'>{file.name}</span>
          <Tag size='small' className='m-0! font-mono'>
            chip={file.chip}
          </Tag>
          <Tag size='small' color='arcoblue' className='m-0! font-mono uppercase'>
            {file.format}
          </Tag>
          <span className='font-mono text-10px text-t-tertiary'>{file.size}</span>
          <span className='font-mono text-10px text-t-tertiary'>span={file.span}</span>

          <div className='ms-auto flex items-center gap-6px'>
            <span className='font-mono text-9px text-t-disabled'>{t('eda.waveforms.zoom')}</span>
            <Tooltip content={t('eda.waveforms.zoomOut')}>
              <Button
                size='mini'
                shape='circle'
                icon={<Minus size='12' fill='currentColor' />}
                onClick={() => zoomBy(-1)}
              />
            </Tooltip>
            <span className='w-32px text-center font-mono text-10px text-t-secondary'>{zoom}x</span>
            <Tooltip content={t('eda.waveforms.zoomIn')}>
              <Button
                size='mini'
                shape='circle'
                icon={<Plus size='12' fill='currentColor' />}
                onClick={() => zoomBy(1)}
              />
            </Tooltip>
            <Tooltip content={t('eda.waveforms.fit')}>
              <Button
                size='mini'
                shape='circle'
                icon={<ZoomIn size='12' fill='currentColor' />}
                onClick={fitToWindow}
              />
            </Tooltip>
            <span className='mx-4px h-20px w-1px bg-3' />
            <Button
              size='small'
              type='text'
              onClick={() => askAgent(t('eda.waveforms.agentPrompt', { file: file.name, cursor }))}
            >
              {t('eda.actions.askAgent')}
            </Button>
          </div>
        </header>

        <div className='flex min-h-0 flex-1'>
          <div className='flex shrink-0 flex-col border-r border-solid border-b-base bg-1' style={{ width: LABEL_W }}>
            <div className='flex h-26px items-center gap-4px border-b border-solid border-b-base px-8px font-mono text-9px text-t-disabled'>
              <Aiming size='9' fill='currentColor' />
              {t('eda.waveforms.signal')}
            </div>
            {file.signals.map((signal) => {
              const isHidden = hidden.has(signal.name);
              return (
                <Button
                  key={signal.name}
                  type='text'
                  long
                  className='h-36px! shrink-0! justify-start! rounded-none! border-b! border-solid! border-b-base! px-8px!'
                  onClick={() => toggleSignal(signal.name)}
                >
                  <span className='flex w-full items-center gap-6px'>
                    <span
                      className='size-6px shrink-0 rounded-full'
                      style={{ background: signal.color, opacity: isHidden ? 0.25 : 1 }}
                    />
                    <span
                      className={classNames(
                        'min-w-0 flex-1 truncate text-left font-mono text-10px',
                        isHidden ? 'text-t-disabled line-through' : 'text-t-secondary'
                      )}
                    >
                      {signal.name}
                    </span>
                    <span className='font-mono text-9px text-t-disabled'>{signal.width}b</span>
                    {isHidden ? (
                      <PreviewCloseOne size='10' fill='currentColor' className='text-t-disabled' />
                    ) : (
                      <PreviewOpen size='10' fill='currentColor' className='text-t-disabled' />
                    )}
                  </span>
                </Button>
              );
            })}
          </div>

          <div ref={scrollRef} className='min-h-0 flex-1 overflow-auto bg-base'>
            <WavePlot
              file={file}
              zoom={zoom}
              width={svgWidth}
              height={svgHeight}
              hidden={hidden}
              cursorT={cursorT}
              onCursor={setCursorT}
            />
          </div>

          <div className='flex w-190px shrink-0 flex-col border-l border-solid border-b-base bg-1'>
            <div className='flex h-26px items-center justify-between border-b border-solid border-b-base px-8px font-mono text-9px'>
              <span className='text-t-disabled'>{t('eda.waveforms.valueAt', { t: cursor })}</span>
              <span className='text-primary'>
                {cursorT === null ? t('eda.waveforms.mid') : t('eda.waveforms.cursor')}
              </span>
            </div>

            {file.signals.map((signal) => (
              <div
                key={signal.name}
                className='flex h-36px items-center gap-6px border-b border-solid border-b-base px-8px'
              >
                <span
                  className='size-6px shrink-0 rounded-full'
                  style={{ background: signal.color, opacity: hidden.has(signal.name) ? 0.25 : 1 }}
                />
                <span className='min-w-0 flex-1 truncate font-mono text-9px text-t-tertiary'>{signal.name}</span>
                <span
                  className='font-mono text-10px text-t-primary'
                  style={{ opacity: hidden.has(signal.name) ? 0.35 : 1 }}
                >
                  {valueAt(signal, cursor)}
                </span>
              </div>
            ))}

            <div className='mt-auto flex flex-col gap-6px border-t border-solid border-b-base px-8px py-8px'>
              <div className='text-9px uppercase tracking-wide text-t-disabled'>{t('eda.waveforms.edgeStats')}</div>
              <StatRow label={t('eda.waveforms.signals')} value={String(file.signals.length)} />
              <StatRow label={t('eda.waveforms.transitions')} value={String(transitionCount)} />
              <StatRow label={t('eda.waveforms.hidden')} value={String(hidden.size)} />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

const StatRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className='flex items-center justify-between font-mono text-10px text-t-tertiary'>
    <span>{label}</span>
    <span className='text-t-secondary'>{value}</span>
  </div>
);

type WavePlotProps = {
  file: WaveFile;
  zoom: number;
  width: number;
  height: number;
  hidden: Set<string>;
  cursorT: number | null;
  onCursor: (t: number | null) => void;
};

const WavePlot: React.FC<WavePlotProps> = ({ file, zoom, width, height, hidden, cursorT, onCursor }) => {
  const plotWidth = file.span * zoom;

  const ticks = useMemo(() => {
    const step = zoom <= 5 ? 16 : zoom <= 8 ? 8 : 4;
    const out: number[] = [];
    for (let t = 0; t <= file.span; t += step) out.push(t);
    return out;
  }, [file.span, zoom]);

  const onMove = (event: React.MouseEvent<SVGSVGElement>): void => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    onCursor(Math.max(0, Math.min(file.span, Math.round(x / zoom))));
  };

  return (
    <svg
      width={width}
      height={height}
      className='block select-none'
      onMouseMove={onMove}
      onMouseLeave={() => onCursor(null)}
    >
      <rect x={0} y={0} width={width} height={RULER_H} fill='var(--bg-1)' />
      {ticks.map((tick) => {
        const x = tick * zoom;
        return (
          <g key={tick}>
            <line x1={x} y1={0} x2={x} y2={height} stroke='var(--border-base)' strokeDasharray='2 4' opacity={0.55} />
            <text x={x + 3} y={16} fontSize={9} fontFamily='var(--font-mono)' fill='var(--bg-6)'>
              {tick}
            </text>
          </g>
        );
      })}

      {file.signals.map((signal, index) => {
        const y = RULER_H + index * LANE_H;
        const dim = hidden.has(signal.name) ? 0.22 : 1;
        return (
          <g key={signal.name} opacity={dim}>
            <rect
              x={0}
              y={y}
              width={width}
              height={LANE_H}
              fill={index % 2 === 0 ? 'var(--bg-base)' : 'var(--bg-1)'}
              opacity={0.35}
            />
            <line x1={0} y1={y + LANE_H} x2={width} y2={y + LANE_H} stroke='var(--border-base)' opacity={0.5} />
            {signal.kind === 'bit' ? (
              <BitShape signal={signal} y={y} zoom={zoom} span={file.span} />
            ) : (
              <BusShape signal={signal} y={y} zoom={zoom} span={file.span} />
            )}
          </g>
        );
      })}

      {cursorT !== null ? (
        <g>
          <line
            x1={cursorT * zoom}
            y1={0}
            x2={cursorT * zoom}
            y2={height}
            stroke='var(--primary)'
            strokeWidth={1}
            opacity={0.8}
          />
          <circle cx={cursorT * zoom} cy={RULER_H - 5} r={2.5} fill='var(--primary)' />
          <rect
            x={Math.min(cursorT * zoom + 4, plotWidth - 46)}
            y={2}
            width={42}
            height={14}
            rx={3}
            fill='var(--primary)'
          />
          <text
            x={Math.min(cursorT * zoom + 25, plotWidth - 25)}
            y={12}
            textAnchor='middle'
            fontSize={9}
            fontFamily='var(--font-mono)'
            fill='#fff'
          >
            t={cursorT}
          </text>
        </g>
      ) : null}
    </svg>
  );
};

const BitShape: React.FC<{ signal: WaveSignal; y: number; zoom: number; span: number }> = ({
  signal,
  y,
  zoom,
  span,
}) => {
  const high = y + 9;
  const low = y + LANE_H - 9;

  if (signal.transitions.length === 0) return <g />;

  const yFor = (value: string): number => (value === '1' ? high : low);
  const first = signal.transitions[0];
  let path = `M 0 ${yFor(first.value)}`;
  let previousX = 0;
  let previousValue = first.value;

  for (const transition of signal.transitions) {
    const x = Math.min(transition.t * zoom, span * zoom);
    if (x > previousX) path += ` L ${x} ${yFor(previousValue)}`;
    path += ` L ${x} ${yFor(transition.value)}`;
    previousValue = transition.value;
    previousX = x;
  }
  path += ` L ${span * zoom} ${yFor(previousValue)}`;

  return (
    <g>
      <path d={path} fill='none' stroke={signal.color} strokeWidth={1.6} strokeLinejoin='round' />
      {signal.transitions
        .filter((transition) => transition.t > 0)
        .map((transition) => (
          <circle
            key={transition.t}
            cx={Math.min(transition.t * zoom, span * zoom)}
            cy={yFor(transition.value)}
            r={1.4}
            fill={signal.color}
          />
        ))}
    </g>
  );
};

const BusShape: React.FC<{ signal: WaveSignal; y: number; zoom: number; span: number }> = ({
  signal,
  y,
  zoom,
  span,
}) => {
  const top = y + 10;
  const bottom = y + LANE_H - 10;
  const mid = (top + bottom) / 2;
  const slant = 3;

  const segments = signal.transitions.map((transition, index) => ({
    from: transition.t,
    to: signal.transitions[index + 1] ? signal.transitions[index + 1].t : span,
    value: transition.value,
  }));

  return (
    <g>
      {segments.map((segment, index) => {
        const x0 = Math.min(segment.from * zoom, span * zoom);
        const x1 = Math.min(segment.to * zoom, span * zoom);
        const width = x1 - x0;
        if (width <= 1) return null;
        const s = Math.min(slant, width / 2);
        const path = [
          `M ${x0 + s} ${top}`,
          `L ${x1 - s} ${top}`,
          `L ${x1} ${mid}`,
          `L ${x1 - s} ${bottom}`,
          `L ${x0 + s} ${bottom}`,
          `L ${x0} ${mid}`,
          'Z',
        ].join(' ');
        return (
          <g key={index}>
            <path d={path} fill={`${signal.color}18`} stroke={signal.color} strokeWidth={1.2} strokeLinejoin='round' />
            {width > 46 ? (
              <text
                x={x0 + width / 2}
                y={mid + 3.5}
                textAnchor='middle'
                fontSize={9}
                fontFamily='var(--font-mono)'
                fill={signal.color}
              >
                {segment.value}
              </text>
            ) : null}
          </g>
        );
      })}
    </g>
  );
};
