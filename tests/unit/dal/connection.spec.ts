import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const { mockInitialize, mockDestroy, MockDataSource } = vi.hoisted(() => {
  const mockInitialize = vi.fn();
  const mockDestroy = vi.fn().mockResolvedValue(undefined);

  class MockDataSource {
    isInitialized = false;
    options: Record<string, unknown>;
    initialize = mockInitialize;
    destroy = mockDestroy;

    constructor(public config: Record<string, unknown>) {
      this.options = { host: config.host, port: config.port, database: config.database };
      mockInitialize.mockImplementation(() => {
        this.isInitialized = true;
        return Promise.resolve(this);
      });
      mockDestroy.mockImplementation(() => {
        this.isInitialized = false;
        return Promise.resolve();
      });
    }
  }

  return { mockInitialize, mockDestroy, MockDataSource };
});

vi.mock('typeorm', () => ({
  DataSource: MockDataSource,
  Entity: () => () => undefined,
  PrimaryColumn: () => () => undefined,
  Column: () => () => undefined,
  UpdateDateColumn: () => () => undefined,
}));

describe('dal/connection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('DB_HOST', 'localhost');
    vi.stubEnv('DB_PORT', '5432');
    vi.stubEnv('DB_NAME', 'testdb');
    vi.stubEnv('DB_USER', 'user');
    vi.stubEnv('DB_PASSWORD', 'pass');
    vi.stubEnv('DB_SSL', 'false');
    vi.stubEnv('DB_POOL_MAX', '10');
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('createDataSource should create a DataSource with env-based config', async () => {
    const { createDataSource } = await import('@src/dal/connection');

    const ds = createDataSource();

    expect((ds as unknown as { config: Record<string, unknown> }).config).toEqual(
      expect.objectContaining({
        type: 'postgres',
        host: 'localhost',
        port: 5432,
        database: 'testdb',
        username: 'user',
        password: 'pass',
        ssl: false,
        synchronize: false,
        poolSize: 10,
      })
    );
  });

  it('createDataSource should enable SSL when DB_SSL is true', async () => {
    vi.stubEnv('DB_SSL', 'true');
    vi.resetModules();

    const { createDataSource } = await import('@src/dal/connection');

    const ds = createDataSource();

    expect((ds as unknown as { config: Record<string, unknown> }).config).toEqual(
      expect.objectContaining({
        ssl: { rejectUnauthorized: false },
      })
    );
  });

  it('createDataSource should throw when required env vars are missing', async () => {
    vi.stubEnv('DB_HOST', '');
    vi.resetModules();

    const { createDataSource } = await import('@src/dal/connection');

    expect(() => createDataSource()).toThrow('Missing required environment variable: DB_HOST');
  });

  it('initializeDb should create and initialize data source', async () => {
    const { initializeDb } = await import('@src/dal/connection');

    const ds = await initializeDb();

    expect(mockInitialize).toHaveBeenCalledTimes(1);
    expect(ds).toBeDefined();
    expect(ds.isInitialized).toBe(true);
  });

  it('getDataSource should throw when not initialized', async () => {
    const { getDataSource } = await import('@src/dal/connection');

    expect(() => getDataSource()).toThrow('DataSource not initialized');
  });

  it('closeDb should destroy data source when initialized', async () => {
    const { initializeDb, closeDb } = await import('@src/dal/connection');

    await initializeDb();
    await closeDb();

    expect(mockDestroy).toHaveBeenCalledTimes(1);
  });

  it('closeDb should do nothing when not initialized', async () => {
    const { closeDb } = await import('@src/dal/connection');

    await closeDb();

    expect(mockDestroy).not.toHaveBeenCalled();
  });
});
