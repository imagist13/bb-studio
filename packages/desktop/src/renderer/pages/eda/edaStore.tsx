/**
 * @license
 * Copyright 2025 BBUI (bbui.dev)
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useCallback, useContext, useMemo, useReducer } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { Ball, OpenFile, PageKey, Run, StageKey, StageStatus } from './types';
import { MOCK_BALLS, MOCK_FILE_CONTENT, MOCK_OPEN_FILES, MOCK_RUNS, MOCK_WAVEFORMS } from './mockData';

export type EdaTab = PageKey;

export const EDA_TABS: readonly EdaTab[] = ['overview', 'chips', 'balls', 'waveforms', 'advanced'];

export const isEdaTab = (value: string | undefined): value is EdaTab =>
  value !== undefined && (EDA_TABS as readonly string[]).includes(value);

/** The workbench keeps its active section in the URL so the sider and the page stay in sync. */
export const edaTabFromPath = (pathname: string): EdaTab => {
  const segment = pathname.split('/')[2];
  return isEdaTab(segment) ? segment : 'overview';
};

export const edaTabPath = (tab: EdaTab): string => `/eda/${tab}`;

type EdaState = {
  chip: string;
  ball: string | null;
  balls: Ball[];
  runs: Run[];
  activeRunId: string | null;
  waveformId: string;
  openFiles: OpenFile[];
  activePath: string | null;
  terminalOpen: boolean;
};

type EdaAction =
  | { type: 'chip'; chip: string }
  | { type: 'ball'; ball: string | null }
  | { type: 'activeRun'; id: string | null }
  | { type: 'addRun'; run: Run; invalidate?: { ballId: string; stageKey: StageKey } }
  | { type: 'finishRun'; id: string; stageKey?: StageKey; ballId?: string; status: 'success' | 'failed' }
  | { type: 'waveform'; id: string }
  | { type: 'openFile'; path: string }
  | { type: 'closeFile'; path: string }
  | { type: 'activePath'; path: string }
  | { type: 'fileContent'; path: string; content: string }
  | { type: 'toggleTerminal' };

const fileLanguage = (path: string): string => {
  if (path.endsWith('.toml')) return 'ini';
  if (path.endsWith('.scala')) return 'scala';
  if (path.endsWith('.rs')) return 'rust';
  if (path.endsWith('.py')) return 'python';
  if (path.endsWith('.sv') || path.endsWith('.svh')) return 'systemverilog';
  if (path.endsWith('.md')) return 'markdown';
  return 'plaintext';
};

const fileBaseName = (path: string): string => path.split('/').pop() ?? path;

const initialState = (): EdaState => ({
  chip: 'toy',
  ball: null,
  balls: MOCK_BALLS.map((ball) => ({ ...ball, stages: ball.stages.map((stage) => ({ ...stage })) })),
  runs: MOCK_RUNS.map((run) => ({ ...run })),
  activeRunId: 'run_5f3a',
  waveformId: MOCK_WAVEFORMS[0].id,
  openFiles: MOCK_OPEN_FILES.map((file) => ({ ...file, savedContent: file.content, dirty: false })),
  activePath: MOCK_OPEN_FILES[0]?.path ?? null,
  terminalOpen: false,
});

const detachForChip = (state: EdaState, chip: string): string | null => {
  const run = state.runs.find((item) => item.id === state.activeRunId);
  return run && run.chip !== chip ? null : state.activeRunId;
};

const detachForBall = (state: EdaState, ball: string | null): string | null => {
  const run = state.runs.find((item) => item.id === state.activeRunId);
  return run && (run.ball ?? null) !== ball ? null : state.activeRunId;
};

const stageWithStatus = (ball: Ball, key: StageKey, status: StageStatus, line: string): Ball => ({
  ...ball,
  stages: ball.stages.map((stage) => (stage.key === key ? { ...stage, status, log: [...stage.log, line] } : stage)),
});

const reducer = (state: EdaState, action: EdaAction): EdaState => {
  switch (action.type) {
    case 'chip':
      return {
        ...state,
        chip: action.chip,
        ball: state.ball && state.balls.some((item) => item.id === state.ball) ? state.ball : null,
        activeRunId: detachForChip(state, action.chip),
      };

    case 'ball':
      return { ...state, ball: action.ball, activeRunId: detachForBall(state, action.ball) };

    case 'activeRun': {
      if (!action.id) return { ...state, activeRunId: null };
      const run = state.runs.find((item) => item.id === action.id);
      if (!run) return state;
      return { ...state, activeRunId: run.id, chip: run.chip, ball: run.ball ?? null };
    }

    case 'addRun': {
      const next: EdaState = { ...state, runs: [action.run, ...state.runs], activeRunId: action.run.id };
      if (!action.invalidate) return next;
      const { ballId, stageKey } = action.invalidate;
      const index = state.balls.find((item) => item.id === ballId)?.stages.findIndex((s) => s.key === stageKey) ?? -1;
      if (index < 0) return next;
      return {
        ...next,
        balls: next.balls.map((ball) => {
          if (ball.id !== ballId) return ball;
          return {
            ...ball,
            stages: ball.stages.map((stage, stageIndex) => {
              if (stageIndex < index) return stage;
              if (stageIndex === index) {
                return {
                  ...stage,
                  status: 'running',
                  log: [...stage.log, `[gate] rerun queued (${action.run.id})`],
                };
              }
              return {
                ...stage,
                status: 'gray',
                log: [...stage.log, '[gate] upstream changed — rerun required'],
              };
            }),
          };
        }),
      };
    }

    case 'finishRun': {
      const runs = state.runs.map((run) =>
        run.id === action.id
          ? {
              ...run,
              status: action.status,
              progress: 100,
              duration: run.duration === '0s' ? (action.status === 'success' ? '3.2s' : '1.8s') : run.duration,
              log: [...run.log, action.status === 'success' ? '[run] status=PASS' : '[run] status=FAIL'],
            }
          : run
      );
      let balls = state.balls;
      if (action.ballId && action.stageKey) {
        balls = balls.map((ball) =>
          ball.id === action.ballId
            ? stageWithStatus(
                ball,
                action.stageKey as StageKey,
                action.status === 'success' ? 'green' : 'red',
                action.status === 'success' ? '[gate] rerun PASS' : '[gate] rerun FAIL'
              )
            : ball
        );
      } else if (action.ballId) {
        const nextStatus: StageStatus = action.status === 'success' ? 'green' : 'red';
        balls = balls.map((ball) =>
          ball.id === action.ballId
            ? {
                ...ball,
                stages: ball.stages.map((stage) =>
                  stage.status === 'running'
                    ? {
                        ...stage,
                        status: nextStatus,
                        log: [...stage.log, action.status === 'success' ? '[gate] status=PASS' : '[gate] status=FAIL'],
                      }
                    : stage
                ),
              }
            : ball
        );
      }
      return { ...state, runs, balls };
    }

    case 'waveform':
      return { ...state, waveformId: action.id };

    case 'openFile': {
      if (state.openFiles.some((file) => file.path === action.path)) {
        return { ...state, activePath: action.path };
      }
      const content = MOCK_FILE_CONTENT[action.path] ?? `// ${action.path}`;
      const file: OpenFile = {
        path: action.path,
        name: fileBaseName(action.path),
        language: fileLanguage(action.path),
        content,
        savedContent: content,
        dirty: false,
      };
      return { ...state, openFiles: [...state.openFiles, file], activePath: action.path };
    }

    case 'closeFile': {
      const remaining = state.openFiles.filter((file) => file.path !== action.path);
      return {
        ...state,
        openFiles: remaining,
        activePath:
          state.activePath === action.path ? (remaining[remaining.length - 1]?.path ?? null) : state.activePath,
      };
    }

    case 'activePath':
      return { ...state, activePath: action.path };

    case 'fileContent':
      return {
        ...state,
        openFiles: state.openFiles.map((file) =>
          file.path === action.path
            ? { ...file, content: action.content, dirty: action.content !== file.savedContent }
            : file
        ),
      };

    case 'toggleTerminal':
      return { ...state, terminalOpen: !state.terminalOpen };

    default:
      return state;
  }
};

type EdaContextValue = {
  state: EdaState;
  tab: EdaTab;
  setTab: (tab: EdaTab) => void;
  setChip: (chip: string) => void;
  setBall: (ball: string | null) => void;
  setActiveRun: (id: string | null) => void;
  startRun: (chip: string, ball?: string) => Run;
  rerunFromStage: (ballId: string, stageKey: StageKey) => void;
  setWaveformId: (id: string) => void;
  openFile: (path: string) => void;
  closeFile: (path: string) => void;
  setActivePath: (path: string) => void;
  updateFileContent: (path: string, content: string) => void;
  toggleTerminal: () => void;
};

const EdaContext = createContext<EdaContextValue | null>(null);

let runSeq = 0;
const nextRunId = (): string => `run_${Date.now().toString(36).slice(-5)}${runSeq++}`;

export const ballStatus = (ball: Ball): 'pass' | 'fail' | 'partial' => {
  if (ball.stages.some((stage) => stage.status === 'red')) return 'fail';
  if (ball.stages.every((stage) => stage.status === 'green')) return 'pass';
  return 'partial';
};

export const EdaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const navigate = useNavigate();
  const location = useLocation();
  const tab = edaTabFromPath(location.pathname);

  const setTab = useCallback(
    (next: EdaTab) => {
      void navigate(edaTabPath(next));
    },
    [navigate]
  );
  const setChip = useCallback((chip: string) => dispatch({ type: 'chip', chip }), []);
  const setBall = useCallback((ball: string | null) => dispatch({ type: 'ball', ball }), []);
  const setActiveRun = useCallback((id: string | null) => dispatch({ type: 'activeRun', id }), []);
  const setWaveformId = useCallback((id: string) => dispatch({ type: 'waveform', id }), []);
  const openFile = useCallback((path: string) => dispatch({ type: 'openFile', path }), []);
  const closeFile = useCallback((path: string) => dispatch({ type: 'closeFile', path }), []);
  const setActivePath = useCallback((path: string) => dispatch({ type: 'activePath', path }), []);
  const updateFileContent = useCallback(
    (path: string, content: string) => dispatch({ type: 'fileContent', path, content }),
    []
  );
  const toggleTerminal = useCallback(() => dispatch({ type: 'toggleTerminal' }), []);

  const startRun = useCallback(
    (chip: string, ball?: string): Run => {
      const id = nextRunId();
      const ballRecord = ball ? state.balls.find((item) => item.id === ball) : undefined;
      const ballName = ballRecord?.name ?? ball;
      // A gate run starts at the first stage that is not green.
      const gateStage = ballRecord?.stages.find((stage) => stage.status !== 'green')?.key ?? 'contract';
      const run: Run = {
        id,
        kind: ball ? 'gate' : 'sim',
        command: ball ? `bbdev gate --ball ${ballName}` : `bbdev verilator --chip ${chip}`,
        chip,
        ball,
        status: 'running',
        progress: 6,
        commit: 'd8e9207',
        target: 'verilator',
        seed: 42,
        startedAt: 'just now',
        duration: '0s',
        traceId: `tr_${id.slice(4)}`,
        log: ball
          ? [`[gate] ball=${ballName}`, '[gate] load ball.yaml', '[gate] contract ok', '[gate] cbemu running…']
          : [`[bbdev] verilator --chip ${chip}`, '[verilator] building model', '[verilator] sim start'],
      };
      dispatch({
        type: 'addRun',
        run,
        invalidate: ball ? { ballId: ball, stageKey: gateStage } : undefined,
      });
      window.setTimeout(() => {
        dispatch({ type: 'finishRun', id, status: 'success', ballId: ball, stageKey: gateStage });
      }, 5200);
      return run;
    },
    [state.balls]
  );

  const rerunFromStage = useCallback(
    (ballId: string, stageKey: StageKey) => {
      const ball = state.balls.find((item) => item.id === ballId);
      const index = ball?.stages.findIndex((stage) => stage.key === stageKey) ?? -1;
      if (!ball || index < 0) return;
      if (ball.stages[index].status === 'running') return;

      const id = nextRunId();
      const run: Run = {
        id,
        kind: 'gate',
        command: `bbdev gate --ball ${ball.name} --from ${stageKey}`,
        chip: state.chip,
        ball: ballId,
        status: 'running',
        progress: 8,
        commit: 'd8e9207',
        target: 'verilator',
        seed: 42,
        startedAt: 'just now',
        duration: '0s',
        traceId: `tr_${id.slice(4)}`,
        log: [
          `[gate] rerun ball=${ball.name} from stage=${stageKey}`,
          `[gate] upstream artifacts reused (0..${index - 1})`,
          `[gate] downstream invalidated: ${ball.stages
            .slice(index + 1)
            .map((stage) => stage.key)
            .join(', ')}`,
        ],
        stageKey,
        fromStage: stageKey,
        parentRun: state.activeRunId ?? undefined,
      };
      dispatch({ type: 'addRun', run, invalidate: { ballId, stageKey } });
      window.setTimeout(() => {
        dispatch({ type: 'finishRun', id, stageKey, ballId, status: 'success' });
      }, 3200);
    },
    [state.balls, state.chip, state.activeRunId]
  );

  const value = useMemo<EdaContextValue>(
    () => ({
      state,
      tab,
      setTab,
      setChip,
      setBall,
      setActiveRun,
      startRun,
      rerunFromStage,
      setWaveformId,
      openFile,
      closeFile,
      setActivePath,
      updateFileContent,
      toggleTerminal,
    }),
    [
      state,
      tab,
      setTab,
      setChip,
      setBall,
      setActiveRun,
      startRun,
      rerunFromStage,
      setWaveformId,
      openFile,
      closeFile,
      setActivePath,
      updateFileContent,
      toggleTerminal,
    ]
  );

  return <EdaContext.Provider value={value}>{children}</EdaContext.Provider>;
};

export const useEda = (): EdaContextValue => {
  const value = useContext(EdaContext);
  if (!value) throw new Error('useEda must be used inside EdaProvider');
  return value;
};
