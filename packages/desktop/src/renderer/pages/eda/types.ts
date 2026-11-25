/**
 * @license
 * Copyright 2025 BBUI (bbui.dev)
 * SPDX-License-Identifier: Apache-2.0
 */

export type PageKey = 'overview' | 'chips' | 'balls' | 'waveforms' | 'advanced';

export type StageKey = 'contract' | 'cbemu' | 'compiler' | 'rtl' | 'ppauvm';

export type StageStatus = 'green' | 'red' | 'gray' | 'running';

export type Chip = {
  id: string;
  name: string;
  description: string;
  cores: number;
  tiles: number;
  balls: number;
  frequency: string;
  process: string;
  status: 'ready' | 'wip' | 'stale';
};

export type BallStage = {
  key: StageKey;
  status: StageStatus;
  duration: string;
  metric: string;
  log: string[];
};

export type Ball = {
  id: string;
  name: string;
  core: string;
  summary: string;
  kind: string;
  stages: BallStage[];
};

export type ArtifactKind = 'isa' | 'trace' | 'binary' | 'vcd' | 'coverage' | 'report';

export type Artifact = {
  id: string;
  kind: ArtifactKind;
  name: string;
  path: string;
  meta?: string;
};

export type StageRun = {
  key: StageKey;
  status: StageStatus;
  duration: string;
  /** content hash of the stage inputs; equal hash means the artifacts can be reused */
  inputsHash: string;
  artifacts: Artifact[];
};

export type RunKind = 'sim' | 'gate';
export type RunStatus = 'running' | 'queued' | 'success' | 'failed' | 'cancelled';
export type RunTarget = 'verilator' | 'bebop' | 'uvm' | 'yosys';

export type Run = {
  id: string;
  kind: RunKind;
  command: string;
  chip: string;
  ball?: string;
  status: RunStatus;
  progress: number;
  commit: string;
  target: RunTarget;
  seed?: number;
  startedAt: string;
  duration: string;
  traceId: string;
  log: string[];
  /** gate runs: the stage this run executes */
  stageKey?: StageKey;
  /** gate runs: downstream stages before this one are reused */
  fromStage?: StageKey;
  /** rerun lineage */
  parentRun?: string;
  stages?: StageRun[];
  artifacts?: Artifact[];
};

export type PinKind = 'code' | 'log' | 'wave' | 'artifact' | 'config' | 'run';

export type Pin = {
  id: string;
  kind: PinKind;
  label: string;
  /** structured reference: path#L10-L20, run#t=22..28, artifact id … */
  ref: string;
};

export type WaveView = {
  artifactId: string;
  t0: number;
  t1: number;
  cursorA: number;
  cursorB: number;
  signals: string[];
  groups: string[];
  radix: 'hex' | 'bin' | 'dec';
  markers: { id: string; t: number; label: string }[];
};

export type Investigation = {
  id: string;
  runIds: string[];
  pins: Pin[];
  openFiles: string[];
  waveView?: WaveView;
  chatThreadId?: string;
};

export type WaveTransition = {
  t: number;
  value: string;
};

export type WaveSignal = {
  name: string;
  kind: 'bit' | 'bus';
  width: number;
  color: string;
  transitions: WaveTransition[];
};

export type WaveFile = {
  id: string;
  name: string;
  chip: string;
  format: 'vcd' | 'fst';
  size: string;
  createdAt: string;
  span: number;
  signals: WaveSignal[];
};

export type FileNode = {
  name: string;
  path: string;
  kind: 'file' | 'dir';
  language?: string;
  children?: FileNode[];
};

export type OpenFile = {
  path: string;
  name: string;
  language: string;
  content: string;
  /** content as last loaded from disk; used to derive the dirty flag */
  savedContent?: string;
  dirty?: boolean;
};

export type ChatToolStatus = 'running' | 'done' | 'error';

export type ChatPart =
  | { type: 'text'; text: string }
  | {
      type: 'tool';
      id: string;
      name: string;
      status: ChatToolStatus;
      summary: string;
      detail?: string;
      lines?: string[];
    }
  | {
      type: 'result';
      title: string;
      rows: { label: string; value: string; tone?: 'default' | 'success' | 'danger' | 'warning' }[];
    };

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  parts: ChatPart[];
  streaming?: boolean;
  createdAt: number;
};

export type ModelId = 'opus-5-5' | 'sonnet-5-5' | 'haiku-5-5' | 'fable-5-1';
