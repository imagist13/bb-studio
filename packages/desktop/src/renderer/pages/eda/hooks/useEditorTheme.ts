/**
 * @license
 * Copyright 2025 BBUI (bbui.dev)
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';

const readTheme = (): 'light' | 'dark' =>
  (document.documentElement.getAttribute('data-theme') as 'light' | 'dark') || 'light';

/** Track the app theme for Monaco editors. */
export const useEditorTheme = (): 'vs' | 'vs-dark' => {
  const [theme, setTheme] = useState<'light' | 'dark'>(readTheme);

  useEffect(() => {
    const observer = new MutationObserver(() => setTheme(readTheme()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  return theme === 'dark' ? 'vs-dark' : 'vs';
};
