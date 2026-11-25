/**
 * @license
 * Copyright 2025 BBUI (bbui.dev)
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { Tooltip } from '@arco-design/web-react';
import { ArrowCircleLeft, Code, Cpu, Cube, DashboardOne, Waves } from '@icon-park/react';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { getSiderTooltipProps } from '@renderer/utils/ui/siderTooltip';
import { edaTabFromPath, edaTabPath } from '../edaStore';
import type { EdaTab } from '../edaStore';

type EdaSiderProps = {
  collapsed?: boolean;
  tooltipEnabled?: boolean;
};

const itemClass = (collapsed: boolean, active: boolean): string =>
  classNames(
    'box-border group h-34px w-full flex items-center gap-8px rd-8px cursor-pointer shrink-0 transition-colors text-t-primary',
    collapsed ? 'justify-center px-0' : 'justify-start ps-10px pe-8px',
    active ? 'bg-fill-3' : 'hover:bg-fill-3 active:bg-fill-4'
  );

/**
 * Sidebar for the EDA workspace. The workbench is a peer of the chat page, so it
 * swaps the whole agent sidebar out rather than nesting inside it.
 */
const EdaSider: React.FC<EdaSiderProps> = ({ collapsed = false, tooltipEnabled = false }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const activeTab = edaTabFromPath(pathname);
  const siderTooltipProps = getSiderTooltipProps(tooltipEnabled);

  const backToChat = (): void => {
    // Mirror the titlebar's convention: return to the last non-section page.
    let target = '/guid';
    try {
      const stored = sessionStorage.getItem('bb:last-non-settings-path');
      if (stored && !stored.startsWith('/settings') && !stored.startsWith('/eda')) target = stored;
    } catch {
      // ignore
    }
    Promise.resolve(navigate(target)).catch((error) => {
      console.error('Navigation failed:', error);
    });
  };

  const items = useMemo(
    () => [
      { id: 'overview' as EdaTab, label: t('eda.tabs.overview'), icon: <DashboardOne /> },
      { id: 'chips' as EdaTab, label: t('eda.tabs.chips'), icon: <Cpu /> },
      { id: 'balls' as EdaTab, label: t('eda.tabs.balls'), icon: <Cube /> },
      { id: 'waveforms' as EdaTab, label: t('eda.tabs.waveforms'), icon: <Waves /> },
      { id: 'advanced' as EdaTab, label: t('eda.tabs.advanced'), icon: <Code /> },
    ],
    [t]
  );

  const renderIcon = (icon: React.ReactElement): React.ReactElement =>
    React.cloneElement(icon as React.ReactElement<{ theme?: string; size?: string; className?: string }>, {
      theme: 'outline',
      size: '16',
      className: 'block leading-none shrink-0',
    });

  return (
    <div className='size-full flex flex-col gap-2px overflow-y-auto overflow-x-hidden'>
      <Tooltip {...siderTooltipProps} content={t('common.back')} position='right'>
        <div className={itemClass(collapsed, false)} onClick={backToChat}>
          <span className='size-22px flex items-center justify-center shrink-0'>{renderIcon(<ArrowCircleLeft />)}</span>
          <span className='collapsed-hidden truncate text-14px font-[500] leading-24px'>{t('common.back')}</span>
        </div>
      </Tooltip>

      <div
        className={classNames('shrink-0 mt-4px mb-2px h-1px bg-(--color-border-2)', collapsed ? 'mx-6px' : 'mx-10px')}
      />

      {!collapsed ? (
        <div className='px-12px pt-4px text-11px uppercase tracking-wide text-t-disabled'>{t('eda.nav')}</div>
      ) : null}

      {items.map((item) => {
        const active = item.id === activeTab;
        return (
          <Tooltip key={item.id} {...siderTooltipProps} content={item.label} position='right'>
            <div
              data-eda-section={item.id}
              className={itemClass(collapsed, active)}
              onClick={() => {
                Promise.resolve(navigate(edaTabPath(item.id))).catch((error) => {
                  console.error('Navigation failed:', error);
                });
              }}
            >
              <span
                className={classNames(
                  'size-22px flex items-center justify-center shrink-0',
                  active ? 'text-primary' : 'text-t-secondary'
                )}
              >
                {renderIcon(item.icon)}
              </span>
              <span
                className={classNames(
                  'collapsed-hidden truncate text-14px font-[500] leading-24px',
                  active ? 'text-t-primary' : 'text-t-secondary group-hover:text-t-primary'
                )}
              >
                {item.label}
              </span>
            </div>
          </Tooltip>
        );
      })}
    </div>
  );
};

export default EdaSider;
