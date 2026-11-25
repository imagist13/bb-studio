/**
 * @license
 * Copyright 2025 BBUI (bbui.dev)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Artifact, Ball, Chip, FileNode, OpenFile, Run, StageRun, WaveFile, WaveSignal } from './types';

export const STAGE_LABELS: Record<string, string> = {
  contract: 'contract',
  cbemu: 'cbemu',
  compiler: 'compiler',
  rtl: 'rtl',
  ppauvm: 'ppauvm',
};

export const STAGE_TITLES: Record<string, string> = {
  contract: 'Contract',
  cbemu: 'CBEMU',
  compiler: 'Compiler',
  rtl: 'RTL',
  ppauvm: 'PPA / UVM',
};

export const MOCK_CHIPS: Chip[] = [
  {
    id: 'toy',
    name: 'toy',
    description: 'Minimal bring-up chip: 2 cores, 4 tiles, full ball list for smoke tests.',
    cores: 2,
    tiles: 4,
    balls: 8,
    frequency: '100 MHz',
    process: '28nm',
    status: 'ready',
  },
  {
    id: 'pebble',
    name: 'pebble',
    description: 'Mid-size mesh with shared-memory NoC, the default target for regression.',
    cores: 4,
    tiles: 8,
    balls: 12,
    frequency: '250 MHz',
    process: '28nm',
    status: 'ready',
  },
  {
    id: 'goban',
    name: 'goban',
    description: 'Large mesh configuration used for bandwidth and arbitration studies.',
    cores: 8,
    tiles: 16,
    balls: 16,
    frequency: '400 MHz',
    process: '22nm',
    status: 'wip',
  },
  {
    id: 'poly',
    name: 'poly',
    description: 'Balanced configuration with polyhedral accelerator blocks.',
    cores: 6,
    tiles: 12,
    balls: 14,
    frequency: '300 MHz',
    process: '22nm',
    status: 'ready',
  },
  {
    id: 'multi-rocket',
    name: 'multi-rocket',
    description: 'Four Rocket cores over the mesh, used for OS bring-up.',
    cores: 4,
    tiles: 8,
    balls: 10,
    frequency: '200 MHz',
    process: '28nm',
    status: 'stale',
  },
];

const stage = (
  key: Ball['stages'][number]['key'],
  status: Ball['stages'][number]['status'],
  duration: string,
  metric: string,
  log: string[]
): Ball['stages'][number] => ({ key, status, duration, metric, log });

const greenStages = (name: string, metric = 'ok'): Ball['stages'] => [
  stage('contract', 'green', '0.4s', 'schema ok', [
    `[contract] load examples/balls/${name}/ball.yaml`,
    `[contract] validate ports, memory regions, isa entries`,
    `[contract] OK — 0 errors, 0 warnings`,
  ]),
  stage('cbemu', 'green', '3.1s', metric, [
    `[cbemu] build functional model`,
    `[cbemu] run 1,024 random transactions`,
    `[cbemu] all checks passed (1,024/1,024)`,
  ]),
  stage('compiler', 'green', '1.8s', 'codegen ok', [
    `[compiler] lower ball ops -> Ball ISA`,
    `[compiler] allocate banks, spill = 0`,
    `[compiler] emitted 214 instructions`,
  ]),
  stage('rtl', 'green', '12.4s', 'verilator pass', [
    `[rtl] chisel elaborate ${name}`,
    `[rtl] verilator build (jobs=16)`,
    `[rtl] sim finished: cycles=18,402  status=PASS`,
  ]),
  stage('ppauvm', 'green', '6.2s', 'coverage 96%', [
    `[ppauvm] uvm_smoke ${name}`,
    `[ppauvm] functional coverage 96.2%`,
    `[ppauvm] signoff checklist complete`,
  ]),
];

export const MOCK_BALLS: Ball[] = [
  {
    id: 'gemmini',
    name: 'gemmini',
    core: 'ball',
    kind: 'matrix-multiply',
    summary: 'Systolic-array GEMM accelerator with configurable dataflow.',
    stages: greenStages('gemmini', 'cycle exact'),
  },
  {
    id: 'smatmul',
    name: 'smatmul',
    core: 'ball',
    kind: 'sparse matmul',
    summary: 'Sparse matrix multiply with compressed row scheduling.',
    stages: [
      stage('contract', 'green', '0.4s', 'schema ok', [
        '[contract] load examples/balls/smatmul/ball.yaml',
        '[contract] CSR descriptor accepted',
      ]),
      stage('cbemu', 'green', '2.7s', 'density 0.18', [
        '[cbemu] run sparse corpus (18% density)',
        '[cbemu] result matches golden',
      ]),
      stage('compiler', 'red', '1.9s', 'bank conflict', [
        '[compiler] lower ball ops -> Ball ISA',
        'ERROR: bank hash collision at pc=0x0042',
        '  bank 7 requested by lane 0 and lane 3 in the same cycle',
        '  suggested fix: pad stride 16 -> 17',
      ]),
      stage('rtl', 'gray', '—', 'blocked', ['[rtl] skipped — upstream compiler stage failed']),
      stage('ppauvm', 'gray', '—', 'blocked', ['[ppauvm] skipped — no RTL artifacts']),
    ],
  },
  {
    id: 'im2col',
    name: 'im2col',
    core: 'ball',
    kind: 'layout transform',
    summary: 'Image-to-column transform for convolution pipelines.',
    stages: greenStages('im2col'),
  },
  {
    id: 'transpose',
    name: 'transpose',
    core: 'ball',
    kind: 'layout transform',
    summary: 'Bank-aware matrix transpose with conflict-free tiling.',
    stages: greenStages('transpose'),
  },
  {
    id: 'matadd',
    name: 'matadd',
    core: 'ball',
    kind: 'elementwise',
    summary: 'Elementwise matrix addition, the smallest end-to-end smoke ball.',
    stages: greenStages('matadd'),
  },
  {
    id: 'relu',
    name: 'relu',
    core: 'ball',
    kind: 'elementwise',
    summary: 'Rectified linear unit over vector tiles.',
    stages: greenStages('relu'),
  },
  {
    id: 'maxpool',
    name: 'maxpool',
    core: 'ball',
    kind: 'reduction',
    summary: '2x2 / 3x3 max pooling with stride control.',
    stages: [
      stage('contract', 'green', '0.3s', 'schema ok', ['[contract] load maxpool ball.yaml']),
      stage('cbemu', 'green', '1.2s', 'checks ok', ['[cbemu] random tensors match golden']),
      stage('compiler', 'green', '1.1s', 'codegen ok', ['[compiler] 96 instructions']),
      stage('rtl', 'red', '9.8s', 'assert fail', [
        '[rtl] verilator sim started',
        'ASSERTION FAILED at maxpool/PE.scala:88',
        '  require(valid && ready) — stalled beat without backpressure',
        '  time=1,204ns  cycle=4,812',
      ]),
      stage('ppauvm', 'gray', '—', 'blocked', ['[ppauvm] skipped — RTL failed']),
    ],
  },
  {
    id: 'toint8',
    name: 'toint8',
    core: 'ball',
    kind: 'quantize',
    summary: 'Float to int8 quantization with per-tensor scale.',
    stages: greenStages('toint8'),
  },
  {
    id: 'int2fp',
    name: 'int2fp',
    core: 'ball',
    kind: 'dequantize',
    summary: 'Int8 to float dequantization with zero-point folding.',
    stages: greenStages('int2fp'),
  },
];

const stageArtifacts = (ball: string, key: string): Artifact[] => {
  switch (key) {
    case 'contract':
      return [
        {
          id: `art_${ball}_isa`,
          kind: 'isa',
          name: `${ball}.isa`,
          path: `build/balls/${ball}/${ball}.isa`,
          meta: '1.2 KB',
        },
      ];
    case 'cbemu':
      return [
        {
          id: `art_${ball}_golden`,
          kind: 'trace',
          name: `${ball}_golden.trace`,
          path: `build/balls/${ball}/golden.trace`,
          meta: '512 KB',
        },
      ];
    case 'compiler':
      return [
        {
          id: `art_${ball}_bin`,
          kind: 'binary',
          name: `${ball}.bin`,
          path: `build/balls/${ball}/${ball}.bin`,
          meta: '8.4 KB',
        },
      ];
    case 'rtl':
      return [
        {
          id: `art_${ball}_vcd`,
          kind: 'vcd',
          name: `${ball}.vcd`,
          path: `trace/${ball}.vcd`,
          meta: '18.4 MB',
        },
      ];
    case 'ppauvm':
      return [
        {
          id: `art_${ball}_coverage`,
          kind: 'coverage',
          name: `${ball}_coverage.json`,
          path: `verify/balls/${ball}/coverage.json`,
          meta: '96.2%',
        },
      ];
    default:
      return [];
  }
};

const stageRuns = (ball: Ball): StageRun[] =>
  ball.stages.map((s) => ({
    key: s.key,
    status: s.status,
    duration: s.duration,
    inputsHash: `sha_${ball.id}_${s.key}`,
    artifacts: stageArtifacts(ball.id, s.key),
  }));

const gateBall = (id: string): Ball => MOCK_BALLS.find((b) => b.id === id) ?? MOCK_BALLS[0];

export const MOCK_RUNS: Run[] = [
  {
    id: 'run_5f3a',
    kind: 'sim',
    command: 'bbdev verilator --chip toy --binary toy-vecunit_matmul_ones-baremetal',
    chip: 'toy',
    status: 'running',
    progress: 62,
    commit: 'd8e9207',
    target: 'verilator',
    seed: 42,
    startedAt: '2m 18s ago',
    duration: '2m 18s',
    traceId: 'tr_9f41c2',
    log: [
      '[bbdev] nix develop .#verilator',
      '[bbdev] mill arch.runMain top.ToyMain',
      '[verilator] building model (jobs=16)',
      '[verilator] sim start: toy-vecunit_matmul_ones-baremetal',
      '[trace] cycle=12,400  pc=0x8000004a  inst=ball.mma',
      '[trace] bank 3 -> 3, bank 7 -> 7',
    ],
    artifacts: [
      {
        id: 'art_5f3a_vcd',
        kind: 'vcd',
        name: 'toy_vecunit_matmul_ones.vcd',
        path: 'trace/toy_vecunit_matmul_ones.vcd',
        meta: '18.4 MB',
      },
    ],
  },
  {
    id: 'run_7a21',
    kind: 'sim',
    command: 'bbdev bebop-verilator --chip pebble --binary mesh-shm-conflict',
    chip: 'pebble',
    status: 'running',
    progress: 31,
    commit: 'd8e9207',
    target: 'bebop',
    seed: 7,
    startedAt: '48s ago',
    duration: '48s',
    traceId: 'tr_2b8d10',
    log: [
      '[bebop] load mesh_shm config (4x4)',
      '[bebop] verilator model ready',
      '[mesh] cross-core bank move test',
      '[mesh] arbitration round 1/4',
    ],
    artifacts: [],
  },
  {
    id: 'run_4b90',
    kind: 'sim',
    command: 'bbdev uvm --build --test blink_test',
    chip: 'toy',
    status: 'success',
    progress: 100,
    commit: 'd8e9207',
    target: 'uvm',
    startedAt: '11m ago',
    duration: '1m 06s',
    traceId: 'tr_55aa01',
    log: ['[uvm] build ok', '[uvm] blink_test PASS', '[uvm] coverage 94.1%'],
    artifacts: [
      {
        id: 'art_4b90_coverage',
        kind: 'coverage',
        name: 'blink_test_coverage.json',
        path: 'verify/uvm/build/coverage.json',
        meta: '94.1%',
      },
      {
        id: 'art_4b90_report',
        kind: 'report',
        name: 'blink_test.log',
        path: 'verify/uvm/build/blink_test.log',
        meta: '1m 06s',
      },
    ],
  },
  {
    id: 'run_3c11',
    kind: 'sim',
    command: 'bbdev yosys --chip goban --top buckyball',
    chip: 'goban',
    status: 'failed',
    progress: 100,
    commit: 'd8e9207',
    target: 'yosys',
    startedAt: '26m ago',
    duration: '3m 42s',
    traceId: 'tr_71c9e3',
    log: [
      '[yosys] read arch/generated/goban.v',
      'ERROR: Module `\\mesh_shm_wrap` not found',
      '[yosys] synthesis aborted',
    ],
    artifacts: [
      {
        id: 'art_3c11_report',
        kind: 'report',
        name: 'yosys.log',
        path: 'out/goban/yosys.log',
      },
    ],
  },
  {
    id: 'run_2d77',
    kind: 'sim',
    command: 'bbdev verilator --chip toy --binary toy-gemmini-matmul',
    chip: 'toy',
    status: 'success',
    progress: 100,
    commit: 'a4993cdb',
    target: 'verilator',
    seed: 42,
    startedAt: '1h ago',
    duration: '54s',
    traceId: 'tr_03fe8b',
    log: ['[verilator] sim finished', '[verilator] status=PASS cycles=18,402'],
    artifacts: [
      {
        id: 'art_2d77_vcd',
        kind: 'vcd',
        name: 'toy_gemmini_matmul.vcd',
        path: 'trace/toy_gemmini_matmul.vcd',
        meta: '9.7 MB',
      },
    ],
  },
  {
    id: 'run_smat',
    kind: 'gate',
    command: 'bbdev gate --ball smatmul',
    chip: 'pebble',
    ball: 'smatmul',
    status: 'failed',
    progress: 100,
    commit: 'd8e9207',
    target: 'verilator',
    seed: 42,
    startedAt: '32m ago',
    duration: '6.9s',
    traceId: 'tr_71c9e3',
    stageKey: 'compiler',
    log: [
      '[gate] load examples/balls/smatmul/ball.yaml',
      '[contract] OK',
      '[cbemu] 1,024/1,024 transactions matched',
      '[compiler] lower ball ops -> Ball ISA',
      'ERROR: bank hash collision at pc=0x0042',
      '  bank 7 requested by lane 0 and lane 3 in the same cycle',
      '  suggested fix: pad stride 16 -> 17',
      '[gate] downstream stages invalidated: rtl, ppauvm',
    ],
    stages: stageRuns(gateBall('smatmul')),
    artifacts: [],
  },
  {
    id: 'run_max',
    kind: 'gate',
    command: 'bbdev gate --ball maxpool',
    chip: 'toy',
    ball: 'maxpool',
    status: 'failed',
    progress: 100,
    commit: 'a4993cdb',
    target: 'verilator',
    seed: 11,
    startedAt: '1h 22m ago',
    duration: '18.3s',
    traceId: 'tr_2b8d10',
    stageKey: 'rtl',
    log: [
      '[gate] load examples/balls/maxpool/ball.yaml',
      '[contract] OK',
      '[cbemu] 1,024/1,024 transactions matched',
      '[compiler] emitted 188 instructions',
      '[rtl] chisel elaborate maxpool',
      'ASSERT: maxpool lane 2 out of range at cycle 4,180',
      '[gate] downstream stages invalidated: ppauvm',
    ],
    stages: stageRuns(gateBall('maxpool')),
    artifacts: [],
  },
];

const bit = (name: string, color: string, transitions: { t: number; value: string }[]): WaveSignal => ({
  name,
  kind: 'bit',
  width: 1,
  color,
  transitions,
});

const bus = (name: string, width: number, color: string, transitions: { t: number; value: string }[]): WaveSignal => ({
  name,
  kind: 'bus',
  width,
  color,
  transitions,
});

const clock = (): WaveSignal => {
  const transitions: { t: number; value: string }[] = [];
  for (let t = 0; t <= 96; t += 2) {
    transitions.push({ t, value: t % 4 === 0 ? '1' : '0' });
  }
  return bit('clk', '#6ea8fe', transitions);
};

export const MOCK_WAVEFORMS: WaveFile[] = [
  {
    id: 'wv_1',
    name: 'toy_vecunit_matmul_ones.vcd',
    chip: 'toy',
    format: 'vcd',
    size: '18.4 MB',
    createdAt: '2m ago',
    span: 96,
    signals: [
      clock(),
      bit('reset', '#f06d74', [
        { t: 0, value: '1' },
        { t: 8, value: '0' },
      ]),
      bit('valid', '#58c98b', [
        { t: 0, value: '0' },
        { t: 14, value: '1' },
        { t: 62, value: '0' },
      ]),
      bit('ready', '#e8b45c', [
        { t: 0, value: '0' },
        { t: 10, value: '1' },
        { t: 30, value: '0' },
        { t: 36, value: '1' },
        { t: 78, value: '0' },
      ]),
      bus('pc[31:0]', 32, '#c792ea', [
        { t: 0, value: '0x80000000' },
        { t: 12, value: '0x80000004' },
        { t: 18, value: '0x80000008' },
        { t: 26, value: '0x8000000c' },
        { t: 40, value: '0x80000010' },
        { t: 58, value: '0x80000014' },
        { t: 74, value: '0x80000018' },
      ]),
      bus('bank_id[3:0]', 4, '#7ee0c3', [
        { t: 0, value: '0x0' },
        { t: 14, value: '0x3' },
        { t: 22, value: '0x7' },
        { t: 38, value: '0x3' },
        { t: 54, value: '0x7' },
        { t: 70, value: '0x1' },
      ]),
      bus('data[63:0]', 64, '#ffcb6b', [
        { t: 0, value: '0x0000000000000000' },
        { t: 14, value: '0x3f8000003f800000' },
        { t: 28, value: '0x4000000040000000' },
        { t: 44, value: '0x4040000040400000' },
        { t: 60, value: '0x4080000040800000' },
        { t: 80, value: '0x0000000000000000' },
      ]),
    ],
  },
  {
    id: 'wv_2',
    name: 'mesh_shm_conflict.fst',
    chip: 'pebble',
    format: 'fst',
    size: '42.1 MB',
    createdAt: '48s ago',
    span: 96,
    signals: [
      clock(),
      bit('req_valid', '#58c98b', [
        { t: 0, value: '0' },
        { t: 6, value: '1' },
        { t: 44, value: '0' },
        { t: 52, value: '1' },
        { t: 88, value: '0' },
      ]),
      bit('conflict', '#f06d74', [
        { t: 0, value: '0' },
        { t: 22, value: '1' },
        { t: 28, value: '0' },
        { t: 66, value: '1' },
        { t: 70, value: '0' },
      ]),
      bus('src_core[1:0]', 2, '#c792ea', [
        { t: 0, value: '0' },
        { t: 6, value: '1' },
        { t: 30, value: '2' },
        { t: 52, value: '3' },
        { t: 74, value: '0' },
      ]),
      bus('bank[2:0]', 3, '#7ee0c3', [
        { t: 0, value: '0' },
        { t: 6, value: '5' },
        { t: 22, value: '5' },
        { t: 34, value: '6' },
        { t: 66, value: '5' },
        { t: 82, value: '2' },
      ]),
    ],
  },
  {
    id: 'wv_3',
    name: 'gemmini_pe_array.vcd',
    chip: 'toy',
    format: 'vcd',
    size: '9.7 MB',
    createdAt: '1h ago',
    span: 96,
    signals: [
      clock(),
      bit('mac_valid', '#58c98b', [
        { t: 0, value: '0' },
        { t: 12, value: '1' },
        { t: 84, value: '0' },
      ]),
      bus('a[7:0]', 8, '#ffcb6b', [
        { t: 0, value: '0x00' },
        { t: 12, value: '0x7f' },
        { t: 36, value: '0x00' },
        { t: 60, value: '0x7f' },
        { t: 84, value: '0x00' },
      ]),
      bus('b[7:0]', 8, '#c792ea', [
        { t: 0, value: '0x00' },
        { t: 12, value: '0x02' },
        { t: 48, value: '0x03' },
        { t: 72, value: '0x00' },
      ]),
      bus('acc[31:0]', 32, '#6ea8fe', [
        { t: 0, value: '0x00000000' },
        { t: 16, value: '0x000000fe' },
        { t: 32, value: '0x000002fe' },
        { t: 48, value: '0x000005fa' },
        { t: 64, value: '0x000008f6' },
        { t: 88, value: '0x00000bf2' },
      ]),
    ],
  },
];

export const MOCK_FILE_TREE: FileNode[] = [
  {
    name: 'arch',
    path: 'arch',
    kind: 'dir',
    children: [
      {
        name: 'framework',
        path: 'arch/framework',
        kind: 'dir',
        children: [
          {
            name: 'root',
            path: 'arch/framework/root',
            kind: 'dir',
            children: [
              {
                name: 'MeshShm.scala',
                path: 'arch/framework/root/MeshShm.scala',
                kind: 'file',
                language: 'scala',
              },
              {
                name: 'Arbiter.scala',
                path: 'arch/framework/root/Arbiter.scala',
                kind: 'file',
                language: 'scala',
              },
            ],
          },
          {
            name: 'balldomain',
            path: 'arch/framework/balldomain',
            kind: 'dir',
            children: [
              {
                name: 'Ball.scala',
                path: 'arch/framework/balldomain/Ball.scala',
                kind: 'file',
                language: 'scala',
              },
              {
                name: 'BallISA.scala',
                path: 'arch/framework/balldomain/BallISA.scala',
                kind: 'file',
                language: 'scala',
              },
            ],
          },
        ],
      },
      {
        name: 'chip.toml',
        path: 'arch/chip.toml',
        kind: 'file',
        language: 'ini',
      },
    ],
  },
  {
    name: 'bebop',
    path: 'bebop',
    kind: 'dir',
    children: [
      {
        name: 'src',
        path: 'bebop/src',
        kind: 'dir',
        children: [
          {
            name: 'nodes',
            path: 'bebop/src/nodes',
            kind: 'dir',
            children: [
              {
                name: 'verilator',
                path: 'bebop/src/nodes/verilator',
                kind: 'dir',
                children: [
                  {
                    name: 'mod.rs',
                    path: 'bebop/src/nodes/verilator/mod.rs',
                    kind: 'file',
                    language: 'rust',
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: 'bbdev',
    path: 'bbdev',
    kind: 'dir',
    children: [
      {
        name: 'api',
        path: 'bbdev/api',
        kind: 'dir',
        children: [
          {
            name: 'steps',
            path: 'bbdev/api/steps',
            kind: 'dir',
            children: [
              {
                name: 'verilator',
                path: 'bbdev/api/steps/verilator',
                kind: 'dir',
                children: [
                  {
                    name: 'run.py',
                    path: 'bbdev/api/steps/verilator/run.py',
                    kind: 'file',
                    language: 'python',
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: 'verify',
    path: 'verify',
    kind: 'dir',
    children: [
      {
        name: 'uvm',
        path: 'verify/uvm',
        kind: 'dir',
        children: [
          {
            name: 'src',
            path: 'verify/uvm/src',
            kind: 'dir',
            children: [
              {
                name: 'ball',
                path: 'verify/uvm/src/ball',
                kind: 'dir',
                children: [
                  {
                    name: 'bb_blink_if.sv',
                    path: 'verify/uvm/src/ball/bb_blink_if.sv',
                    kind: 'file',
                    language: 'systemverilog',
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: 'examples',
    path: 'examples',
    kind: 'dir',
    children: [
      {
        name: 'chips',
        path: 'examples/chips',
        kind: 'dir',
        children: [
          {
            name: 'toy',
            path: 'examples/chips/toy',
            kind: 'dir',
            children: [
              {
                name: 'chip.toml',
                path: 'examples/chips/toy/chip.toml',
                kind: 'file',
                language: 'ini',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: 'README.md',
    path: 'README.md',
    kind: 'file',
    language: 'markdown',
  },
];

export const MOCK_FILE_CONTENT: Record<string, string> = {
  'arch/framework/root/MeshShm.scala': `package buckyball.root

import chisel3._
import chisel3.util._

/** Mesh shared-memory NoC.
  *
  * Each core owns a bank of shared memory. Cross-core accesses are routed
  * through the mesh and arbitrated per channel. The ordering guarantees are
  * documented in docs/mesh-ordering.md.
  */
class MeshShm(val n: Int = 4, val w: Int = 64) extends Module {
  val io = IO(new Bundle {
    val req  = Flipped(Valid(new MeshReq(n, w)))
    val resp = Valid(new MeshResp(w))
  })

  val xbar = Module(new MeshXbar(n, w))
  xbar.io.req <> io.req
  io.resp <> xbar.io.resp

  when(xbar.io.conflict) {
    printf(p"[mesh] conflict: src=\${xbar.io.srcId} bank=\${xbar.io.bankId}\\n")
  }
}
`,
  'arch/framework/root/Arbiter.scala': `package buckyball.root

import chisel3._
import chisel3.util._

/** Fair round-robin arbiter for conflicting mesh channels. */
class FairArbiter(val n: Int) extends Module {
  val io = IO(new Bundle {
    val req  = Input(Vec(n, Bool()))
    val gnt  = Output(Vec(n, Bool()))
    val last = Output(UInt(log2Ceil(n).W))
  })

  val ptr = RegInit(0.U(log2Ceil(n).W))
  val mask = (1.U << ptr)(n.W)

  io.gnt := PriorityEncoderOH(Cat(io.req.drop(ptr.asUInt.toInt), io.req.take(ptr.asUInt.toInt)))
  when(io.gnt.asUInt.orR) {
    ptr := OHToUInt(io.gnt.asUInt | mask)
  }
  io.last := ptr
}
`,
  'arch/framework/balldomain/Ball.scala': `package buckyball.balldomain

import chisel3._
import chisel3.util._

/** Common interface for every ball accelerator. */
abstract class Ball(val params: BallParams) extends Module {
  val io = IO(new BallIO(params))

  def compute(): Unit

  io.done := false.B
  when(io.start) {
    compute()
    io.done := true.B
  }
}
`,
  'arch/framework/balldomain/BallISA.scala': `package buckyball.balldomain

import chisel3._

object BallISA {
  val OP_MMA   = 0x01.U(8.W)
  val OP_ADD   = 0x02.U(8.W)
  val OP_RELU  = 0x03.U(8.W)
  val OP_LOAD  = 0x04.U(8.W)
  val OP_STORE = 0x05.U(8.W)
  val OP_SYNC  = 0x06.U(8.W)
  // 0x07 is reserved for the pending sparse extension.
}
`,
  'arch/chip.toml': `# Buckyball chip configuration
# Generated by bbdev; edit examples/chips/<name>/chip.toml instead.

[chip]
name = "toy"
top = "buckyball.ToyTop"
cores = 2
tiles = 4
frequency_mhz = 100

[mesh]
kind = "shm"
width = 4
banks_per_core = 4
arbitration = "round-robin"

[memory]
address_space = "0x80000000-0x8fffffff"
coherence = "none"

[trace]
itrace = true
mtrace = true
pmctrace = false
`,
  'bebop/src/nodes/verilator/mod.rs': `use anyhow::Result;
use bebop::simulation::{Node, SimEvent};

/// Verilator-backed RTL node.
pub struct VerilatorNode {
    model: verilator::Model,
    traces: TraceSet,
}

impl VerilatorNode {
    pub fn new(config: &VerilatorConfig) -> Result<Self> {
        let model = verilator::load(&config.model_path)?;
        Ok(Self { model, traces: TraceSet::default() })
    }
}

impl Node for VerilatorNode {
    fn step(&mut self) -> Result<SimEvent> {
        self.model.eval();
        self.model.tick();
        self.traces.record(self.model.cycle());
        Ok(SimEvent::Continue)
    }
}
`,
  'bbdev/api/steps/verilator/run.py': `"""Verilator run step for the bbdev API."""

from pathlib import Path

from bbdev.api.steps.common import StepContext, run_shell


async def run(ctx: StepContext) -> dict:
    """Build and run a Verilator simulation."""
    chip = ctx.config["chip"]
    binary = ctx.config["binary"]
    jobs = ctx.config.get("jobs", 16)

    cmd = [
        "bbdev", "verilator",
        "--chip", chip,
        "--binary", binary,
        "--jobs", str(jobs),
    ]
    result = await run_shell(cmd, cwd=Path(ctx.workspace))
    return {
        "trace_id": result.trace_id,
        "status": result.status,
        "logs": result.lines,
    }
`,
  'verify/uvm/src/ball/bb_blink_if.sv': `interface bb_blink_if #(parameter int W = 64) (input logic clk);
  logic          valid;
  logic          ready;
  logic [W-1:0]  data;

  clocking cb @(posedge clk);
    default input #1step output #1step;
    output valid, data;
    input  ready;
  endclocking

  modport drv (clocking cb, output valid, output data, input ready);
  modport mon (input valid, input ready, input data);
endinterface
`,
  'examples/chips/toy/chip.toml': `[chip]
name = "toy"
top = "buckyball.ToyTop"
cores = 2
tiles = 4
frequency_mhz = 100

[balls]
enabled = ["gemmini", "matadd", "relu", "maxpool"]
`,
  'README.md': `# Buckyball

A domain-specific architecture (DSA) framework for rapid accelerator bring-up.

## Quick start

\`\`\`bash
nix develop
bbdev verilator --chip toy --binary toy-vecunit_matmul_ones-baremetal
\`\`\`

## Layout

- \`arch/\` — Chisel hardware
- \`bebop/\` — Rust simulation framework
- \`bbdev/\` — developer toolchain
- \`verify/\` — UVM verification
- \`examples/\` — reference chips and balls
`,
};

export const MOCK_OPEN_FILES: OpenFile[] = [
  {
    path: 'arch/framework/root/MeshShm.scala',
    name: 'MeshShm.scala',
    language: 'scala',
    content: MOCK_FILE_CONTENT['arch/framework/root/MeshShm.scala'],
  },
  {
    path: 'arch/chip.toml',
    name: 'chip.toml',
    language: 'ini',
    content: MOCK_FILE_CONTENT['arch/chip.toml'],
  },
];

export const MOCK_TERMINAL = [
  '$ bbdev verilator --chip toy --binary toy-vecunit_matmul_ones-baremetal',
  '[bbdev] resolving nix develop .#verilator',
  '[bbdev] mill arch.runMain top.ToyMain',
  '[mill] compiling 214 Scala sources...',
  '[mill] generated arch/generated/ToyTop.v',
  '[verilator] building model (jobs=16)',
  '[verilator] sim start',
  '[trace] cycle=12,400  pc=0x8000004a  inst=ball.mma',
  '[trace] bank 3 -> 3, bank 7 -> 7',
  '[trace] cycle=18,402  status=PASS',
  '[bbdev] run finished in 54.2s  (trace_id=tr_9f41c2)',
];
