import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SyncStatus } from '@src/dal/entities/syncState';
import type { ThirdPartyResponse, ScheduleEntry } from '@src/types';

const mockGetSyncState = vi.fn();
const mockUpdateOffset = vi.fn().mockResolvedValue(undefined);
const mockSetStatus = vi.fn().mockResolvedValue(undefined);

vi.mock('@src/dal/repositories/syncStateRepository', () => ({
  getSyncState: (...args: unknown[]) => mockGetSyncState(...args),
  updateOffset: (...args: unknown[]) => mockUpdateOffset(...args),
  setStatus: (...args: unknown[]) => mockSetStatus(...args),
}));

const mockFetchPage = vi.fn();

vi.mock('@src/graphql/api/layerClient', () => ({
  fetchPage: (...args: unknown[]) => mockFetchPage(...args),
}));

const mockInsertObjects = vi.fn().mockResolvedValue(undefined);
const mockUpdateDeprecatedObjects = vi.fn().mockResolvedValue(undefined);

vi.mock('@src/dal/repositories/layerDataRepository', () => ({
  insertObjects: (...args: unknown[]) => mockInsertObjects(...args),
  updateDeprecatedObjects: (...args: unknown[]) => mockUpdateDeprecatedObjects(...args),
}));

vi.mock('@src/common/syncConfig', () => ({
  getSyncConfig: vi.fn().mockReturnValue({
    layers: ['obstacles'],
    syncIntervalMs: 500,
    pollIntervalMs: 600_000,
    pageSize: 100,
    thirdPartyBaseUrl: 'http://mock/graphql',
  }),
}));

import { fetchAndSyncLayerPage } from '@src/handler/layerSyncHandler';

const createLogger = () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
});

describe('layerSyncHandler', () => {
  let logger: ReturnType<typeof createLogger>;
  let entry: ScheduleEntry;

  beforeEach(() => {
    vi.clearAllMocks();
    logger = createLogger();
    entry = { layerName: 'obstacles', nextRunAt: 0 };
    vi.spyOn(Date, 'now').mockReturnValue(1000);
  });

  it('should fetch page, insert objects, update deprecated, and advance offset', async () => {
    const state = { layerName: 'obstacles', status: SyncStatus.SYNCING, lastOffset: 0 };
    const response: ThirdPartyResponse = {
      totalCount: 100,
      returnedCount: 10,
      nextRecord: 10,
      objects: [{ id: 'obj-1', geometry: null, properties: { a: 1 } }],
      deprecated: [{ id: 'dep-1', updatedFields: { status: 'old' } }],
    };

    mockGetSyncState.mockResolvedValueOnce(state).mockResolvedValueOnce(state);
    mockFetchPage.mockResolvedValue(response);

    await fetchAndSyncLayerPage(logger as never, entry);

    expect(mockFetchPage).toHaveBeenCalledWith('obstacles', 0);
    expect(mockInsertObjects).toHaveBeenCalledWith('obstacles', response.objects);
    expect(mockUpdateDeprecatedObjects).toHaveBeenCalledWith('obstacles', response.deprecated);
    expect(mockUpdateOffset).toHaveBeenCalledWith('obstacles', 10);
  });

  it('should not insert when objects array is empty', async () => {
    const state = { layerName: 'obstacles', status: SyncStatus.SYNCING, lastOffset: 5 };
    const response: ThirdPartyResponse = {
      totalCount: 5,
      returnedCount: 0,
      nextRecord: 5,
      objects: [],
      deprecated: [],
    };

    mockGetSyncState.mockResolvedValueOnce(state).mockResolvedValueOnce({ ...state, status: SyncStatus.READY });
    mockFetchPage.mockResolvedValue(response);

    await fetchAndSyncLayerPage(logger as never, entry);

    expect(mockInsertObjects).not.toHaveBeenCalled();
    expect(mockUpdateDeprecatedObjects).not.toHaveBeenCalled();
  });

  it('should set status to READY when SYNCING and no objects returned', async () => {
    const state = { layerName: 'obstacles', status: SyncStatus.SYNCING, lastOffset: 50 };
    const response: ThirdPartyResponse = {
      totalCount: 50,
      returnedCount: 0,
      nextRecord: 50,
      objects: [],
      deprecated: [],
    };

    mockGetSyncState.mockResolvedValueOnce(state).mockResolvedValueOnce({ ...state, status: SyncStatus.READY });
    mockFetchPage.mockResolvedValue(response);

    await fetchAndSyncLayerPage(logger as never, entry);

    expect(mockSetStatus).toHaveBeenCalledWith('obstacles', SyncStatus.READY);
  });

  it('should NOT set status to READY when already READY', async () => {
    const state = { layerName: 'obstacles', status: SyncStatus.READY, lastOffset: 50 };
    const response: ThirdPartyResponse = {
      totalCount: 50,
      returnedCount: 0,
      nextRecord: 50,
      objects: [],
      deprecated: [],
    };

    mockGetSyncState.mockResolvedValue(state);
    mockFetchPage.mockResolvedValue(response);

    await fetchAndSyncLayerPage(logger as never, entry);

    expect(mockSetStatus).not.toHaveBeenCalled();
  });

  it('should set nextRunAt with syncIntervalMs when still SYNCING', async () => {
    const state = { layerName: 'obstacles', status: SyncStatus.SYNCING, lastOffset: 0 };
    const response: ThirdPartyResponse = {
      totalCount: 100,
      returnedCount: 10,
      nextRecord: 10,
      objects: [{ id: '1', geometry: null, properties: {} }],
      deprecated: [],
    };

    mockGetSyncState.mockResolvedValue(state);
    mockFetchPage.mockResolvedValue(response);

    await fetchAndSyncLayerPage(logger as never, entry);

    expect(entry.nextRunAt).toBe(1000 + 500);
  });

  it('should set nextRunAt with pollIntervalMs when READY', async () => {
    const state = { layerName: 'obstacles', status: SyncStatus.READY, lastOffset: 100 };
    const response: ThirdPartyResponse = {
      totalCount: 100,
      returnedCount: 0,
      nextRecord: 100,
      objects: [],
      deprecated: [],
    };

    mockGetSyncState.mockResolvedValue(state);
    mockFetchPage.mockResolvedValue(response);

    await fetchAndSyncLayerPage(logger as never, entry);

    expect(entry.nextRunAt).toBe(1000 + 600_000);
  });

  it('should log error and still update nextRunAt when fetchPage throws', async () => {
    const state = { layerName: 'obstacles', status: SyncStatus.SYNCING, lastOffset: 0 };

    mockGetSyncState.mockResolvedValueOnce(state).mockResolvedValueOnce(state);
    mockFetchPage.mockRejectedValue(new Error('network error'));

    await fetchAndSyncLayerPage(logger as never, entry);

    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('network error'));
    expect(entry.nextRunAt).toBe(1000 + 500);
  });
});
