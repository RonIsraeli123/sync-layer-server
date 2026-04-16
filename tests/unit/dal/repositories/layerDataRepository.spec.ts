import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { LayerObject, DeprecatedObject } from '@src/dal/entities/layerObject';

const {
  mockExecute, mockOrUpdate, mockInsertValues, mockInsertInto, mockInsert,
  mockWhere, mockSet, mockUpdateQb, mockRepo,
} = vi.hoisted(() => {
  const mockExecute = vi.fn().mockResolvedValue(undefined);
  const mockOrUpdate = vi.fn().mockReturnValue({ execute: mockExecute });
  const mockInsertValues = vi.fn().mockReturnValue({ orUpdate: mockOrUpdate });
  const mockInsertInto = vi.fn().mockReturnValue({ values: mockInsertValues });
  const mockInsert = vi.fn().mockReturnValue({ into: mockInsertInto });

  const mockWhere = vi.fn().mockReturnValue({ execute: mockExecute });
  const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
  const mockUpdateQb = vi.fn().mockReturnValue({ set: mockSet });

  const mockRepo = {
    createQueryBuilder: vi.fn(),
  };

  return { mockExecute, mockOrUpdate, mockInsertValues, mockInsertInto, mockInsert, mockWhere, mockSet, mockUpdateQb, mockRepo };
});

vi.mock('@src/dal/connection', () => ({
  getDataSource: vi.fn().mockReturnValue({
    getRepository: vi.fn().mockReturnValue(mockRepo),
  }),
}));

import { insertObjects, updateDeprecatedObjects } from '@src/dal/repositories/layerDataRepository';

describe('layerDataRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('insertObjects', () => {
    it('should do nothing when objects array is empty', async () => {
      await insertObjects('obstacles', []);

      expect(mockRepo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('should upsert objects with conflict on id', async () => {
      mockRepo.createQueryBuilder.mockReturnValue({ insert: mockInsert });
      mockInsert.mockReturnValue({ into: mockInsertInto });
      mockInsertInto.mockReturnValue({ values: mockInsertValues });
      mockInsertValues.mockReturnValue({ orUpdate: mockOrUpdate });
      mockOrUpdate.mockReturnValue({ execute: mockExecute });

      const objects: LayerObject[] = [
        { id: 'obj-1', geometry: { type: 'Point' }, properties: { name: 'test' } },
        { id: 'obj-2', geometry: null, properties: { name: 'test2' } },
      ];

      await insertObjects('obstacles', objects);

      expect(mockInsertValues).toHaveBeenCalledWith(objects);
      expect(mockOrUpdate).toHaveBeenCalledWith(['geometry', 'properties'], ['id']);
      expect(mockExecute).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateDeprecatedObjects', () => {
    it('should do nothing when deprecated array is empty', async () => {
      await updateDeprecatedObjects('obstacles', []);

      expect(mockRepo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('should update each deprecated object with JSONB merge', async () => {
      mockRepo.createQueryBuilder.mockReturnValue({ update: mockUpdateQb });
      mockUpdateQb.mockReturnValue({ set: mockSet });
      mockSet.mockReturnValue({ where: mockWhere });
      mockWhere.mockReturnValue({ execute: mockExecute });

      const deprecated: DeprecatedObject[] = [
        { id: 'dep-1', updatedFields: { status: 'inactive' } },
        { id: 'dep-2', updatedFields: { visible: false } },
      ];

      await updateDeprecatedObjects('obstacles', deprecated);

      expect(mockSet).toHaveBeenCalledTimes(2);
      expect(mockWhere).toHaveBeenCalledWith('id = :id', { id: 'dep-1' });
      expect(mockWhere).toHaveBeenCalledWith('id = :id', { id: 'dep-2' });
      expect(mockExecute).toHaveBeenCalledTimes(2);
    });
  });
});
