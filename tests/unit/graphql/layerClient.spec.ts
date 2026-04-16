import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { ThirdPartyResponse } from '@src/types';

vi.mock('@src/common/syncConfig', () => ({
  getSyncConfig: vi.fn().mockReturnValue({
    thirdPartyBaseUrl: 'http://test-api/graphql',
    pageSize: 100,
    layers: ['obstacles'],
    syncIntervalMs: 500,
    pollIntervalMs: 600_000,
  }),
}));

const mockResponse: ThirdPartyResponse = {
  totalCount: 50,
  returnedCount: 10,
  nextRecord: 10,
  objects: [{ id: 'obj-1', geometry: { type: 'Point' }, properties: { name: 'test' } }],
  deprecated: [{ id: 'dep-1', updatedFields: { status: 'inactive' } }],
};

describe('layerClient', () => {
  let fetchPage: typeof import('@src/graphql/api/layerClient').fetchPage;

  beforeEach(async () => {
    vi.stubGlobal('fetch', vi.fn());
    const mod = await import('@src/graphql/api/layerClient');
    fetchPage = mod.fetchPage;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should send correct GraphQL request and return parsed response', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ data: { layerPage: mockResponse } }),
    } as Response);

    const result = await fetchPage('obstacles', 0);

    expect(fetch).toHaveBeenCalledWith('http://test-api/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: expect.stringContaining('"layerName":"obstacles"'),
    });
    expect(result).toEqual(mockResponse);
  });

  it('should throw on non-ok HTTP response', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    } as Response);

    await expect(fetchPage('obstacles', 0)).rejects.toThrow('Third-party API error: 500 Internal Server Error');
  });

  it('should throw on GraphQL errors', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ errors: [{ message: 'query failed' }] }),
    } as Response);

    await expect(fetchPage('obstacles', 0)).rejects.toThrow('GraphQL errors');
  });

  it('should throw when no data is returned', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as Response);

    await expect(fetchPage('obstacles', 0)).rejects.toThrow('No data returned from third-party API');
  });

  it('should pass offset and pageSize in variables', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ data: { layerPage: mockResponse } }),
    } as Response);

    await fetchPage('myLayer', 42);

    const callBody = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string) as {
      variables: { layerName: string; offset: number; pageSize: number };
    };
    expect(callBody.variables).toEqual({ layerName: 'myLayer', offset: 42, pageSize: 100 });
  });
});
