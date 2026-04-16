import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

const mockInitializeSyncState = vi.fn().mockResolvedValue(undefined);
const mockGetSyncState = vi.fn();

vi.mock('@src/dal/repositories/syncStateRepository', () => ({
  initializeSyncState: (...args: unknown[]) => mockInitializeSyncState(...args),
  getSyncState: (...args: unknown[]) => mockGetSyncState(...args),
}));

const mockFetchAndSyncLayerPage = vi.fn();

vi.mock('@src/handler/layerSyncHandler', () => ({
  fetchAndSyncLayerPage: (...args: unknown[]) => mockFetchAndSyncLayerPage(...args),
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

import { SyncManager } from '@src/scheduler/syncManager';
import { SyncStatus } from '@src/dal/entities/syncState';

const createLogger = () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
});

describe('SyncManager', () => {
  let syncManager: SyncManager;
  let logger: ReturnType<typeof createLogger>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    logger = createLogger();
    syncManager = new SyncManager(logger as never);
  });

  afterEach(() => {
    syncManager.stop();
    vi.useRealTimers();
  });

  it('should initialize sync state for configured layers on start', async () => {
    mockGetSyncState.mockResolvedValue({
      layerName: 'obstacles',
      status: SyncStatus.SYNCING,
      lastOffset: 0,
    });

    mockFetchAndSyncLayerPage.mockImplementation(async () => {
      syncManager.stop();
    });

    const startPromise = syncManager.start();
    await vi.advanceTimersByTimeAsync(0);
    await startPromise;

    expect(mockInitializeSyncState).toHaveBeenCalledWith(['obstacles']);
  });

  it('should schedule all layers and call fetchAndSyncLayerPage', async () => {
    mockGetSyncState.mockResolvedValue({
      layerName: 'obstacles',
      status: SyncStatus.SYNCING,
      lastOffset: 0,
    });

    let callCount = 0;
    mockFetchAndSyncLayerPage.mockImplementation(async () => {
      callCount++;
      if (callCount >= 1) {
        syncManager.stop();
      }
    });

    const startPromise = syncManager.start();
    await vi.advanceTimersByTimeAsync(0);
    await startPromise;

    expect(mockFetchAndSyncLayerPage).toHaveBeenCalledTimes(1);
    expect(mockFetchAndSyncLayerPage).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ layerName: 'obstacles' })
    );
  });

  it('should stop the scheduler loop when stop is called', async () => {
    mockGetSyncState.mockResolvedValue({
      layerName: 'obstacles',
      status: SyncStatus.SYNCING,
      lastOffset: 0,
    });

    mockFetchAndSyncLayerPage.mockImplementation(async (_logger: unknown, entry: { nextRunAt: number }) => {
      entry.nextRunAt = Date.now() + 60_000;
    });

    const startPromise = syncManager.start();
    await vi.advanceTimersByTimeAsync(0);

    syncManager.stop();
    await vi.advanceTimersByTimeAsync(0);

    expect(logger.info).toHaveBeenCalledWith('Stopping sync manager...');
  });

  it('should log info about layers on start', async () => {
    mockGetSyncState.mockResolvedValue({
      layerName: 'obstacles',
      status: SyncStatus.SYNCING,
      lastOffset: 5,
    });

    mockFetchAndSyncLayerPage.mockImplementation(async () => {
      syncManager.stop();
    });

    const startPromise = syncManager.start();
    await vi.advanceTimersByTimeAsync(0);
    await startPromise;

    expect(logger.info).toHaveBeenCalledWith('Initializing sync for layers: obstacles');
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('Layer "obstacles" scheduled')
    );
  });
});
