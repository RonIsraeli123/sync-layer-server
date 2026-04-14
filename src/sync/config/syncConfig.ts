import type { SyncConfig } from '../types';

// TODO: migrate to DB - currently loaded from static config
const syncConfig: SyncConfig = {
  layers: ['obstacles'],
  syncIntervalMs: 500,
  pollIntervalMs: 600_000,
  pageSize: 500,
  thirdPartyBaseUrl: 'http://mock-third-party/graphql',
};

export function getSyncConfig(): SyncConfig {
  return { ...syncConfig };
}
