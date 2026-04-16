import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SyncStatus } from '@src/dal/entities/syncState';

const { mockExecute, mockOrIgnore, mockValues, mockInto, mockInsert, mockFindOneBy, mockFind, mockUpdate, mockRepo } =
  vi.hoisted(() => {
    const mockExecute = vi.fn().mockResolvedValue(undefined);
    const mockOrIgnore = vi.fn().mockReturnValue({ execute: mockExecute });
    const mockValues = vi.fn().mockReturnValue({ orIgnore: mockOrIgnore });
    const mockInto = vi.fn().mockReturnValue({ values: mockValues });
    const mockInsert = vi.fn().mockReturnValue({ into: mockInto });
    const mockFindOneBy = vi.fn();
    const mockFind = vi.fn();
    const mockUpdate = vi.fn();

    const mockRepo = {
      createQueryBuilder: vi.fn().mockReturnValue({ insert: mockInsert }),
      findOneBy: mockFindOneBy,
      find: mockFind,
      update: mockUpdate,
    };

    return { mockExecute, mockOrIgnore, mockValues, mockInto, mockInsert, mockFindOneBy, mockFind, mockUpdate, mockRepo };
  });

vi.mock('@src/dal/connection', () => ({
  getDataSource: vi.fn().mockReturnValue({
    getRepository: vi.fn().mockReturnValue(mockRepo),
  }),
}));

import {
  initializeSyncState,
  getSyncState,
  getAllSyncStates,
  updateOffset,
  setStatus,
} from '@src/dal/repositories/syncStateRepository';

describe('syncStateRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRepo.createQueryBuilder.mockReturnValue({ insert: mockInsert });
    mockInsert.mockReturnValue({ into: mockInto });
    mockInto.mockReturnValue({ values: mockValues });
    mockValues.mockReturnValue({ orIgnore: mockOrIgnore });
    mockOrIgnore.mockReturnValue({ execute: mockExecute });
  });

  describe('initializeSyncState', () => {
    it('should insert a row for each layer with SYNCING status and offset 0', async () => {
      await initializeSyncState(['obstacles', 'buildings']);

      expect(mockValues).toHaveBeenCalledTimes(2);
      expect(mockValues).toHaveBeenCalledWith({
        layerName: 'obstacles',
        status: SyncStatus.SYNCING,
        lastOffset: 0,
      });
      expect(mockValues).toHaveBeenCalledWith({
        layerName: 'buildings',
        status: SyncStatus.SYNCING,
        lastOffset: 0,
      });
      expect(mockExecute).toHaveBeenCalledTimes(2);
    });

    it('should handle empty layers array', async () => {
      await initializeSyncState([]);

      expect(mockValues).not.toHaveBeenCalled();
    });
  });

  describe('getSyncState', () => {
    it('should return the sync state for a layer', async () => {
      const entry = { layerName: 'obstacles', status: SyncStatus.SYNCING, lastOffset: 10, updatedAt: new Date() };
      mockFindOneBy.mockResolvedValue(entry);

      const result = await getSyncState('obstacles');

      expect(mockFindOneBy).toHaveBeenCalledWith({ layerName: 'obstacles' });
      expect(result).toEqual(entry);
    });

    it('should throw when layer not found', async () => {
      mockFindOneBy.mockResolvedValue(null);

      await expect(getSyncState('unknown')).rejects.toThrow('No sync state found for layer "unknown"');
    });
  });

  describe('getAllSyncStates', () => {
    it('should return all sync states', async () => {
      const entries = [
        { layerName: 'obstacles', status: SyncStatus.SYNCING, lastOffset: 0 },
        { layerName: 'buildings', status: SyncStatus.READY, lastOffset: 500 },
      ];
      mockFind.mockResolvedValue(entries);

      const result = await getAllSyncStates();

      expect(result).toEqual(entries);
    });
  });

  describe('updateOffset', () => {
    it('should update the offset for a given layer', async () => {
      mockUpdate.mockResolvedValue(undefined);

      await updateOffset('obstacles', 100);

      expect(mockUpdate).toHaveBeenCalledWith({ layerName: 'obstacles' }, { lastOffset: 100 });
    });
  });

  describe('setStatus', () => {
    it('should update the status for a given layer', async () => {
      mockUpdate.mockResolvedValue(undefined);

      await setStatus('obstacles', SyncStatus.READY);

      expect(mockUpdate).toHaveBeenCalledWith({ layerName: 'obstacles' }, { status: SyncStatus.READY });
    });
  });
});
