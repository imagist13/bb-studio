/**
 * @license
 * Copyright 2025 BBUI (bbui.dev)
 * SPDX-License-Identifier: Apache-2.0
 */

import { getPlatformServices } from '@/common/platform';

/**
 * Returns baseName unchanged in release builds, or baseName + '-dev' in dev builds.
 * When BB_MULTI_INSTANCE=1, appends '-2' to isolate the second dev instance.
 * Used to isolate symlink and directory names between environments.
 *
 * @example
 * getEnvAwareName('.bb')        // release → '.bb',        dev → '.bb-dev'
 * getEnvAwareName('.bb-config') // release → '.bb-config', dev → '.bb-config-dev'
 * // with BB_MULTI_INSTANCE=1:  dev → '.bb-dev-2'
 */
export function getEnvAwareName(baseName: string): string {
  if (getPlatformServices().paths.isPackaged() === true) return baseName;
  const suffix = process.env.BB_MULTI_INSTANCE === '1' ? '-dev-2' : '-dev';
  return `${baseName}${suffix}`;
}
