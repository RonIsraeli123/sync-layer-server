import type { SyncConfig } from '../types';
import { getConfig } from './config';

// TODO: replace with DB-backed config from syncConfigRepository - then delete this file
export function getSyncConfig(): SyncConfig {
  return getConfig().get('sync') as SyncConfig;
}
