/**
 * @license
 * Copyright 2025 BBUI (bbui.dev)
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Button, Drawer, Select, Tooltip } from '@arco-design/web-react';
import { MessageOne, Play } from '@icon-park/react';
import { useTranslation } from 'react-i18next';
import { useLayoutContext } from '@renderer/hooks/context/LayoutContext';
import SettingsPageHeader from '@renderer/pages/settings/components/SettingsPageHeader';
import { MOCK_CHIPS } from './mockData';
import { EdaProvider, useEda } from './edaStore';
import { setEdaChatOpen, useEdaChatState } from './edaChatStore';
import { AdvancedTab } from './components/AdvancedTab';
import { BallsTab } from './components/BallsTab';
import { ChipsTab } from './components/ChipsTab';
import { EdaChatDock } from './components/EdaChatDock';
import { EdaChatPanel } from './components/EdaChatPanel';
import { OverviewTab } from './components/OverviewTab';
import { WaveformsTab } from './components/WaveformsTab';

const Workbench: React.FC = () => {
  const { t } = useTranslation();
  const { state, tab, setChip, startRun } = useEda();
  const layout = useLayoutContext();
  const isMobile = Boolean(layout?.isMobile);
  const { open: chatOpen } = useEdaChatState();

  const closeChat = (): void => setEdaChatOpen(false);

  return (
    <div className='flex h-full min-h-0 bg-base'>
      <div className='flex min-w-0 flex-1 flex-col'>
        <div className='shrink-0 px-16px pt-14px md:px-28px md:pt-24px'>
          <SettingsPageHeader
            sticky={false}
            title={t('eda.title')}
            description={t('eda.description')}
            actions={
              <>
                <Select
                  size='small'
                  value={state.chip}
                  onChange={(value) => setChip(String(value))}
                  style={{ width: 136 }}
                  options={MOCK_CHIPS.map((chip) => ({ label: chip.name, value: chip.id }))}
                />
                <Button
                  size='small'
                  type='primary'
                  icon={<Play size='11' fill='currentColor' />}
                  onClick={() => startRun(state.chip)}
                >
                  {t('eda.actions.runSim')}
                </Button>
                <Tooltip content={t('eda.chat.toggle')}>
                  <Button
                    size='small'
                    icon={<MessageOne size='12' fill='currentColor' />}
                    aria-label={t('eda.chat.toggle')}
                    onClick={() => setEdaChatOpen(!chatOpen)}
                  />
                </Tooltip>
              </>
            }
          />
        </div>

        <div className='min-h-0 flex-1 overflow-hidden pt-14px'>
          {tab === 'overview' ? <OverviewTab /> : null}
          {tab === 'chips' ? <ChipsTab /> : null}
          {tab === 'balls' ? <BallsTab /> : null}
          {tab === 'waveforms' ? <WaveformsTab /> : null}
          {tab === 'advanced' ? <AdvancedTab /> : null}
        </div>
      </div>

      {!isMobile && chatOpen ? <EdaChatDock /> : null}

      {isMobile ? (
        <Drawer
          visible={chatOpen}
          placement='right'
          width='100%'
          title={null}
          footer={null}
          closable={false}
          unmountOnExit
          bodyStyle={{ padding: 0 }}
          onCancel={closeChat}
        >
          <EdaChatPanel onClose={closeChat} />
        </Drawer>
      ) : null}
    </div>
  );
};

export const EdaPage: React.FC = () => (
  <EdaProvider>
    <Workbench />
  </EdaProvider>
);

export default EdaPage;
