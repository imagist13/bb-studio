/**
 * @license
 * Copyright 2025 BBUI (bbui.dev)
 * SPDX-License-Identifier: Apache-2.0
 */

const WORKSPACE_STORAGE_KEY = 'eda.chat.workspace';
const WORKSPACE_UPDATE_TIME_KEY = 'bb_workspace_update_time';

/** Workspace the user sent a chat in most recently, as recorded by the Guid page. */
const readMostRecentWorkspace = (): string => {
  try {
    const stored = window.localStorage.getItem(WORKSPACE_UPDATE_TIME_KEY);
    if (!stored) return '';
    const times = JSON.parse(stored) as Record<string, number>;
    let best = '';
    let bestTime = -1;
    for (const [path, time] of Object.entries(times)) {
      if (typeof time === 'number' && path.trim() && time > bestTime) {
        best = path;
        bestTime = time;
      }
    }
    return best;
  } catch {
    return '';
  }
};

/**
 * Workspace bound to the EDA chat dock.
 *
 * A stored pick always wins. Without one, fall back to the workspace the user
 * most recently sent a chat in — when working on a chip that is usually the
 * repository the workbench talks about, so the agent starts inside it instead
 * of a freshly provisioned temporary workspace. An empty result means "no
 * workspace", which is the Guid page's own default.
 */
export const readEdaWorkspace = (): string => {
  try {
    const stored = window.localStorage.getItem(WORKSPACE_STORAGE_KEY);
    if (stored) return stored;
  } catch {
    // Storage unavailable — fall through to the history-derived default.
  }
  return readMostRecentWorkspace();
};

export const writeEdaWorkspace = (path: string): void => {
  try {
    if (path) {
      window.localStorage.setItem(WORKSPACE_STORAGE_KEY, path);
    } else {
      window.localStorage.removeItem(WORKSPACE_STORAGE_KEY);
    }
  } catch {
    // Storage unavailable — the pick still applies to this session's conversations.
  }
};

/** Last path segment, for the compact label in the dock toolbar. */
export const edaWorkspaceLabel = (path: string): string => /[^\\/]+(?=[\\/]*$)/.exec(path)?.[0] ?? path;
