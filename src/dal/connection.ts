import { DataSource } from 'typeorm';
import { requireEnv } from '../common/env';
import { SyncStateEntry } from './entities/syncState';
import { LayerObjectEntity } from './entities/layerObject';

let dataSource: DataSource | undefined;

export function createDataSource(): DataSource {
  return new DataSource({
    type: 'postgres',
    host: requireEnv('DB_HOST'),
    port: Number(requireEnv('DB_PORT')),
    database: requireEnv('DB_NAME'),
    username: requireEnv('DB_USER'),
    password: requireEnv('DB_PASSWORD'),
    ssl: requireEnv('DB_SSL') === 'true' ? { rejectUnauthorized: false } : false,
    entities: [SyncStateEntry, LayerObjectEntity],
    synchronize: false,
    poolSize: Number(requireEnv('DB_POOL_MAX')),
  });
}

export async function initializeDb(): Promise<DataSource> {
  if (dataSource?.isInitialized) {
    return dataSource;
  }

  dataSource = createDataSource();
  await dataSource.initialize();
  return dataSource;
}

export function getDataSource(): DataSource {
  if (!dataSource?.isInitialized) {
    throw new Error('DataSource not initialized. Call initializeDb() first.');
  }
  return dataSource;
}

export async function closeDb(): Promise<void> {
  if (dataSource?.isInitialized) {
    await dataSource.destroy();
    dataSource = undefined;
  }
}
