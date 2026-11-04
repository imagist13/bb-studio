import BbSelect from '@/renderer/components/base/BbSelect';
import type { SelectHandle } from '@arco-design/web-react/es/Select/interface';
import React, { useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { changeLanguage } from '@/renderer/services/i18n';

const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();
  const selectRef = useRef<SelectHandle>(null);

  const handleLanguageChange = useCallback((value: string) => {
    // 切换前先 blur 触发元素，避免弹层和语言切换竞争布局
    // Blur before switching to avoid dropdown and language change fighting for layout
    selectRef.current?.blur?.();

    const applyLanguage = () => {
      changeLanguage(value).catch((error: Error) => {
        console.error('Failed to change language:', error);
      });
    };

    if (typeof window !== 'undefined' && 'requestAnimationFrame' in window) {
      // 延迟到下一帧执行，确保 DOM 动画已完成 / defer to next frame so DOM animations finish
      window.requestAnimationFrame(() => window.requestAnimationFrame(applyLanguage));
    } else {
      setTimeout(applyLanguage, 0);
    }
  }, []);

  return (
    <div className='flex items-center gap-8px'>
      <BbSelect ref={selectRef} className='w-160px' value={i18n.language} onChange={handleLanguageChange}>
        <BbSelect.Option value='zh-CN'>简体中文</BbSelect.Option>
        <BbSelect.Option value='zh-TW'>繁體中文</BbSelect.Option>
        <BbSelect.Option value='ja-JP'>日本語</BbSelect.Option>
        <BbSelect.Option value='ko-KR'>한국어</BbSelect.Option>
        <BbSelect.Option value='tr-TR'>Türkçe</BbSelect.Option>
        <BbSelect.Option value='ru-RU'>Русский</BbSelect.Option>
        <BbSelect.Option value='uk-UA'>Українська</BbSelect.Option>
        <BbSelect.Option value='pt-BR'>Português (BR)</BbSelect.Option>
        <BbSelect.Option value='de-DE'>Deutsch</BbSelect.Option>
        <BbSelect.Option value='es-ES'>Español</BbSelect.Option>
        <BbSelect.Option value='fr-FR'>Français</BbSelect.Option>
        <BbSelect.Option value='fa-IR'>فارسی</BbSelect.Option>
        <BbSelect.Option value='en-US'>English</BbSelect.Option>
      </BbSelect>
    </div>
  );
};

export default LanguageSwitcher;
