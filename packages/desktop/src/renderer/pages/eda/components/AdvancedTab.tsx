/**
 * @license
 * Copyright 2025 BBUI (bbui.dev)
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Button, Input, Tag, Tooltip } from '@arco-design/web-react';
import { Close, Down, FileCode, FolderClose, FolderOpen, Right, Robot, Search, Terminal } from '@icon-park/react';
import MonacoEditor from '@monaco-editor/react';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { MOCK_FILE_TREE, MOCK_TERMINAL } from '../mockData';
import type { FileNode } from '../types';
import { useEda } from '../edaStore';
import { useEditorTheme } from '../hooks/useEditorTheme';
import { useAskAgent } from './EdaBits';

const languageLabel: Record<string, string> = {
  scala: 'Scala',
  ini: 'TOML',
  rust: 'Rust',
  python: 'Python',
  systemverilog: 'SystemVerilog',
  markdown: 'Markdown',
  plaintext: 'Plain Text',
};

export const AdvancedTab: React.FC = () => {
  const { t } = useTranslation();
  const { state, openFile, closeFile, setActivePath, updateFileContent, toggleTerminal } = useEda();
  const askAgent = useAskAgent();
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(['arch', 'arch/framework', 'arch/framework/root', 'bbdev'])
  );
  const [query, setQuery] = useState('');
  const editorTheme = useEditorTheme();

  const active = state.openFiles.find((file) => file.path === state.activePath) ?? null;

  const toggleDir = (path: string): void => {
    setExpanded((previous) => {
      const next = new Set(previous);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  return (
    <div className='flex h-full min-h-0'>
      <aside className='flex w-252px shrink-0 flex-col border-r border-solid border-b-base bg-1'>
        <div className='flex items-center justify-between border-b border-solid border-b-base px-12px py-8px'>
          <span className='text-9px uppercase tracking-wide text-t-disabled'>{t('eda.advanced.explorer')}</span>
          <span className='font-mono text-9px text-t-disabled'>buckyball</span>
        </div>

        <div className='border-b border-solid border-b-base p-8px'>
          <Input
            allowClear
            size='small'
            value={query}
            onChange={setQuery}
            prefix={<Search size='11' fill='currentColor' className='text-t-disabled' />}
            placeholder={t('eda.advanced.searchFiles')}
          />
        </div>

        <div className='min-h-0 flex-1 overflow-y-auto py-4px'>
          {MOCK_FILE_TREE.map((node) => (
            <TreeItem
              key={node.path}
              node={node}
              depth={0}
              expanded={expanded}
              toggleDir={toggleDir}
              activePath={state.activePath}
              onOpen={openFile}
              query={query}
            />
          ))}
        </div>

        <div className='border-t border-solid border-b-base px-10px py-6px font-mono text-9px text-t-disabled'>
          {t('eda.advanced.readOnly')}
        </div>
      </aside>

      <section className='flex min-w-0 flex-1 flex-col'>
        <div className='flex h-36px shrink-0 items-stretch border-b border-solid border-b-base bg-1'>
          <div className='flex min-w-0 flex-1 items-stretch overflow-x-auto'>
            {state.openFiles.map((file) => {
              const isActive = file.path === state.activePath;
              return (
                <div
                  key={file.path}
                  className={classNames(
                    'flex min-w-0 max-w-220px items-center gap-4px border-r border-solid border-b-base px-6px',
                    isActive ? 'bg-base' : ''
                  )}
                >
                  <Button
                    type='text'
                    size='mini'
                    className={classNames(
                      'min-w-0 flex-1 justify-start! px-2px!',
                      isActive ? 'text-t-primary!' : 'text-t-tertiary!'
                    )}
                    onClick={() => setActivePath(file.path)}
                  >
                    <span className='flex min-w-0 items-center gap-6px'>
                      <FileCode
                        size='11'
                        fill='currentColor'
                        className={isActive ? 'text-primary' : 'text-t-disabled'}
                      />
                      <span className='truncate font-mono'>{file.name}</span>
                      {file.dirty ? <span className='size-6px shrink-0 rounded-full bg-primary' /> : null}
                    </span>
                  </Button>
                  <Tooltip content={t('eda.advanced.closeFile', { name: file.name })}>
                    <Button
                      type='text'
                      size='mini'
                      shape='circle'
                      icon={<Close size='10' fill='currentColor' />}
                      onClick={() => closeFile(file.path)}
                    />
                  </Tooltip>
                </div>
              );
            })}
          </div>

          <div className='flex shrink-0 items-center gap-2px border-l border-solid border-b-base px-6px'>
            <Tooltip content={t('eda.advanced.askAboutFile')}>
              <Button
                type='text'
                size='mini'
                shape='circle'
                disabled={!active}
                icon={<Robot size='13' fill='currentColor' />}
                onClick={() => {
                  if (active) askAgent(t('eda.advanced.filePrompt', { path: active.path }));
                }}
              />
            </Tooltip>
            <Tooltip content={t('eda.advanced.toggleTerminal')}>
              <Button
                type={state.terminalOpen ? 'primary' : 'text'}
                size='mini'
                shape='circle'
                icon={<Terminal size='13' fill='currentColor' />}
                onClick={toggleTerminal}
              />
            </Tooltip>
          </div>
        </div>

        <div className='flex h-28px shrink-0 items-center gap-4px border-b border-solid border-b-base bg-base px-12px font-mono text-9px text-t-disabled'>
          {active ? (
            active.path.split('/').map((part, index, parts) => (
              <span key={index} className='flex items-center gap-4px'>
                <span className={index === parts.length - 1 ? 'text-t-secondary' : undefined}>{part}</span>
                {index < parts.length - 1 ? <Right size='9' fill='currentColor' /> : null}
              </span>
            ))
          ) : (
            <span>{t('eda.advanced.noFile')}</span>
          )}
          {active ? (
            <Tag size='small' className='m-0! ms-auto! font-mono'>
              {languageLabel[active.language] ?? active.language}
            </Tag>
          ) : null}
        </div>

        <div className='min-h-0 flex-1 bg-base'>
          {active ? (
            <MonacoEditor
              height='100%'
              path={active.path}
              language={active.language}
              value={active.content}
              theme={editorTheme}
              onChange={(value) => updateFileContent(active.path, value ?? '')}
              options={{
                minimap: { enabled: false },
                fontSize: 12,
                lineHeight: 20,
                scrollBeyondLastLine: false,
                renderLineHighlight: 'line',
                padding: { top: 12, bottom: 12 },
                overviewRulerLanes: 0,
                smoothScrolling: true,
                cursorBlinking: 'smooth',
                scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
              }}
            />
          ) : (
            <div className='flex h-full flex-col items-center justify-center gap-8px text-t-disabled'>
              <FileCode size='32' fill='currentColor' />
              <p className='m-0 text-11px'>{t('eda.advanced.openHint')}</p>
            </div>
          )}
        </div>

        {state.terminalOpen ? (
          <div className='flex h-196px shrink-0 flex-col border-t border-solid border-b-base bg-base'>
            <div className='flex h-28px items-center gap-12px border-b border-solid border-b-base bg-1 px-12px'>
              <span className='flex items-center gap-4px text-10px text-t-primary'>
                <Terminal size='10' fill='currentColor' className='text-primary' />
                {t('eda.advanced.terminal')}
              </span>
              <span className='text-10px text-t-disabled'>{t('eda.advanced.problems')}</span>
              <span className='text-10px text-t-disabled'>{t('eda.advanced.output')}</span>
              <span className='ms-auto font-mono text-9px text-t-disabled'>bash · nix develop</span>
              <Button
                type='text'
                size='mini'
                shape='circle'
                icon={<Close size='11' fill='currentColor' />}
                onClick={toggleTerminal}
              />
            </div>
            <pre className='m-0 flex-1 overflow-auto p-12px font-mono text-10px leading-relaxed text-t-secondary'>
              {MOCK_TERMINAL.map((line, index) => {
                const isPrompt = line.startsWith('$');
                const danger = /error|fail/i.test(line);
                const success = /pass|finished/i.test(line);
                return (
                  <div
                    key={index}
                    className={
                      isPrompt ? 'text-t-primary' : danger ? 'text-danger' : success ? 'text-success' : undefined
                    }
                  >
                    {line}
                  </div>
                );
              })}
              <div className='mt-4px flex items-center gap-4px text-t-tertiary'>
                <span className='text-success'>buckyball</span>
                <span className='text-primary'>❯</span>
                <span className='inline-block h-12px w-6px animate-pulse bg-t-tertiary' />
              </div>
            </pre>
          </div>
        ) : null}
      </section>
    </div>
  );
};

type TreeItemProps = {
  node: FileNode;
  depth: number;
  expanded: Set<string>;
  toggleDir: (path: string) => void;
  activePath: string | null;
  onOpen: (path: string) => void;
  query: string;
};

const TreeItem: React.FC<TreeItemProps> = ({ node, depth, expanded, toggleDir, activePath, onOpen, query }) => {
  const isDir = node.kind === 'dir';
  const isOpen = expanded.has(node.path);
  const isActive = activePath === node.path;

  if (query && !isDir && !node.name.toLowerCase().includes(query.toLowerCase())) return null;

  if (isDir) {
    return (
      <div>
        <Button
          type='text'
          long
          className='h-auto! justify-start! rounded-none! px-8px! py-4px!'
          style={{ paddingLeft: 8 + depth * 12 }}
          onClick={() => toggleDir(node.path)}
        >
          <span className='flex w-full items-center gap-4px'>
            {isOpen ? (
              <Down size='11' fill='currentColor' className='text-t-disabled' />
            ) : (
              <Right size='11' fill='currentColor' className='text-t-disabled' />
            )}
            {isOpen ? (
              <FolderOpen size='12' fill='currentColor' className='text-primary' />
            ) : (
              <FolderClose size='12' fill='currentColor' className='text-t-tertiary' />
            )}
            <span className='truncate font-mono text-10px text-t-secondary'>{node.name}</span>
          </span>
        </Button>
        {isOpen
          ? node.children?.map((child) => (
              <TreeItem
                key={child.path}
                node={child}
                depth={depth + 1}
                expanded={expanded}
                toggleDir={toggleDir}
                activePath={activePath}
                onOpen={onOpen}
                query={query}
              />
            ))
          : null}
      </div>
    );
  }

  return (
    <Button
      type='text'
      long
      className={classNames('h-auto! justify-start! rounded-none! px-8px! py-4px!', isActive ? 'bg-fill-2!' : '')}
      style={{ paddingLeft: 8 + depth * 12 + 2 }}
      onClick={() => onOpen(node.path)}
    >
      <span className='flex w-full items-center gap-6px'>
        <FileCode size='11' fill='currentColor' className={isActive ? 'text-primary' : 'text-t-disabled'} />
        <span className={classNames('truncate font-mono text-10px', isActive ? 'text-primary' : 'text-t-secondary')}>
          {node.name}
        </span>
      </span>
    </Button>
  );
};
