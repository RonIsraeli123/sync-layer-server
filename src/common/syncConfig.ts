import type { SyncConfig } from '../types';

// TODO: replace with DB-backed config from syncConfigRepository - then delete this file
export function getSyncConfig(): SyncConfig {
  return {
    layers: (process.env.SYNC_LAYERS ?? 'obstacles').split(','),
    syncIntervalMs: Number(process.env.SYNC_INTERVAL_MS) || 500,
    pollIntervalMs: Number(process.env.SYNC_POLL_INTERVAL_MS) || 600_000,
    pageSize: Number(process.env.SYNC_PAGE_SIZE) || 500,
    thirdPartyBaseUrl: process.env.THIRD_PARTY_BASE_URL ?? 'http://mock-third-party/graphql',
  };
}
