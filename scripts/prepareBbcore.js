/**
 * CLI wrapper for prepare-bbcore.
 *
 * Reads environment variables and invokes the shared module.
 *
 * Version resolution order:
 *  1. BB_BACKEND_RUN_ID env (download from BBCore Manual Build artifact)
 *  2. BB_BACKEND_VERSION env (for ad-hoc release overrides)
 *  3. "bbcoreVersion" field in repo-root package.json (the pin)
 *  4. 'latest' (fallback; not recommended for reproducible builds)
 *
 * Environment variables:
 *  - BB_BACKEND_RUN_ID: BBCore Manual Build workflow run id
 *  - BB_BACKEND_VERSION: override the pinned version
 *  - BB_BACKEND_ARCH: target architecture (default: process.arch)
 *  - GH_TOKEN / GITHUB_TOKEN: GitHub API token (for rate limiting)
 */

const path = require('path');
const { prepareBbcore } = require('../packages/shared-scripts/src/prepare-bbcore.js');
const { resolveBbcoreVersion } = require('./resolveBbcoreVersion.js');

const projectRoot = path.resolve(__dirname, '..');
const platform = process.platform;
// Support cross-compilation: BB_BACKEND_ARCH > npm_config_target_arch > process.arch
const arch = process.env.BB_BACKEND_ARCH || process.env.npm_config_target_arch || process.arch;
const version = resolveBbcoreVersion(projectRoot);

try {
  prepareBbcore({ projectRoot, platform, arch, version });
} catch (error) {
  console.error('❌ prepareBbcore failed:', error.message);
  process.exit(1);
}

module.exports = function () {
  try {
    return prepareBbcore({ projectRoot, platform, arch, version });
  } catch (error) {
    console.error('❌ prepareBbcore failed:', error.message);
    throw error;
  }
};
