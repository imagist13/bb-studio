/**
 * @license
 * Copyright 2025 BBUI (bbui.dev)
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Tooltip } from '@arco-design/web-react';
import { Cpu } from '@icon-park/react';
import classNames from 'classnames';
import type { SiderTooltipProps } from '@renderer/utils/ui/siderTooltip';

interface SiderEdaEntryProps {
  isMobile: boolean;
  collapsed: boolean;
  siderTooltipProps: SiderTooltipProps;
  onClick: () => void;
}

/**
 * Entry into the EDA workspace, placed at the top of the chat sidebar. Styled
 * like the other sider rows so it sits in the app chrome without standing out.
 */
const SiderEdaEntry: React.FC<SiderEdaEntryProps> = ({ isMobile, collapsed, siderTooltipProps, onClick }) => {
  const { t } = useTranslation();

  if (collapsed) {
    return (
      <Tooltip {...siderTooltipProps} content={t('eda.nav')} position='right'>
        <div
          className='w-full h-34px flex items-center justify-center cursor-pointer transition-colors rd-8px text-t-primary hover:bg-fill-3 active:bg-fill-4'
          onClick={onClick}
        >
          <Cpu
            theme='outline'
            size='20'
            fill='currentColor'
            className='block leading-none shrink-0'
            style={{ lineHeight: 0 }}
          />
        </div>
      </Tooltip>
    );
  }

  return (
    <Tooltip {...siderTooltipProps} content={t('eda.nav')} position='right'>
      <div
        className={classNames(
          'box-border group h-34px w-full flex items-center justify-start gap-8px ps-10px pe-8px rd-0.5rem cursor-pointer shrink-0 transition-all text-t-primary hover:bg-fill-3 active:bg-fill-4',
          isMobile && 'sider-action-btn-mobile'
        )}
        onClick={onClick}
      >
        <span className='size-22px flex items-center justify-center shrink-0 text-t-primary'>
          <Cpu theme='outline' size='16' fill='currentColor' className='block leading-none' style={{ lineHeight: 0 }} />
        </span>
        <span className='collapsed-hidden text-t-primary text-14px font-[500] leading-24px'>{t('eda.nav')}</span>
      </div>
    </Tooltip>
  );
};

export default SiderEdaEntry;
