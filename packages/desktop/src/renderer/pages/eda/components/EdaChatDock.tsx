/**
 * @license
 * Copyright 2025 BBUI (bbui.dev)
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useResizableSplit } from '@renderer/hooks/ui/useResizableSplit';
import { setEdaChatOpen } from '../edaChatStore';
import { EdaChatPanel } from './EdaChatPanel';

const DOCK_MIN_WIDTH_PX = 320;
const DOCK_MAX_WIDTH_PX = 640;
const DOCK_DEFAULT_WIDTH_PX = 400;
const DOCK_WIDTH_STORAGE_KEY = 'eda.chat.width_px';

/**
 * Desktop column hosting the EDA chat panel.
 *
 * The width is user-resizable and remembered; the panel itself is shared with
 * the mobile drawer so both render the identical conversation surface.
 */
export const EdaChatDock: React.FC = () => {
  const { splitRatio, createDragHandle } = useResizableSplit({
    unit: 'px',
    defaultWidth: DOCK_DEFAULT_WIDTH_PX,
    minWidth: DOCK_MIN_WIDTH_PX,
    maxWidth: DOCK_MAX_WIDTH_PX,
    storageKey: DOCK_WIDTH_STORAGE_KEY,
  });

  return (
    <aside
      className='relative shrink-0 min-h-0 flex flex-col border-s border-solid border-b-2 bg-base'
      style={{ width: splitRatio, minWidth: 0, maxWidth: '46%' }}
    >
      {createDragHandle({ style: { left: '-12px' }, reverse: true, linePlacement: 'end' })}
      <EdaChatPanel onClose={() => setEdaChatOpen(false)} />
    </aside>
  );
};
