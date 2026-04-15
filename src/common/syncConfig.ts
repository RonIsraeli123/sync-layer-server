import type { SyncConfig } from '../types';
import { requireEnv } from './env';

export function getSyncConfig(): SyncConfig {
  return {
    layers: requireEnv('SYNC_LAYERS').split(','),
    syncIntervalMs: Number(requireEnv('SYNC_INTERVAL_MS')),
    pollIntervalMs: Number(requireEnv('SYNC_POLL_INTERVAL_MS')),
    pageSize: Number(requireEnv('SYNC_PAGE_SIZE')),
    thirdPartyBaseUrl: requireEnv('THIRD_PARTY_BASE_URL'),
  };
}
