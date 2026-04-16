import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getSyncConfig } from '@src/common/syncConfig';

describe('getSyncConfig', () => {
  const savedEnv = { ...process.env };

  beforeEach(() => {
    process.env.SYNC_LAYERS = 'obstacles';
    process.env.SYNC_INTERVAL_MS = '500';
    process.env.SYNC_POLL_INTERVAL_MS = '600000';
    process.env.SYNC_PAGE_SIZE = '500';
    process.env.THIRD_PARTY_BASE_URL = 'http://mock-third-party/graphql';
  });

  afterEach(() => {
    process.env = { ...savedEnv };
  });

  it('should return values from environment variables', () => {
    const config = getSyncConfig();

    expect(config.layers).toEqual(['obstacles']);
    expect(config.syncIntervalMs).toBe(500);
    expect(config.pollIntervalMs).toBe(600_000);
    expect(config.pageSize).toBe(500);
    expect(config.thirdPartyBaseUrl).toBe('http://mock-third-party/graphql');
  });

  it('should parse SYNC_LAYERS as comma-separated list', () => {
    process.env.SYNC_LAYERS = 'layer1,layer2,layer3';

    const config = getSyncConfig();

    expect(config.layers).toEqual(['layer1', 'layer2', 'layer3']);
  });

  it('should parse numeric env vars', () => {
    process.env.SYNC_INTERVAL_MS = '1000';
    process.env.SYNC_POLL_INTERVAL_MS = '30000';
    process.env.SYNC_PAGE_SIZE = '100';

    const config = getSyncConfig();

    expect(config.syncIntervalMs).toBe(1000);
    expect(config.pollIntervalMs).toBe(30000);
    expect(config.pageSize).toBe(100);
  });

  it('should use custom THIRD_PARTY_BASE_URL when set', () => {
    process.env.THIRD_PARTY_BASE_URL = 'https://api.example.com/graphql';

    const config = getSyncConfig();

    expect(config.thirdPartyBaseUrl).toBe('https://api.example.com/graphql');
  });

  it('should throw when SYNC_LAYERS is missing', () => {
    delete process.env.SYNC_LAYERS;

    expect(() => getSyncConfig()).toThrow('Missing required environment variable: SYNC_LAYERS');
  });

  it('should throw when SYNC_INTERVAL_MS is missing', () => {
    delete process.env.SYNC_INTERVAL_MS;

    expect(() => getSyncConfig()).toThrow('Missing required environment variable: SYNC_INTERVAL_MS');
  });

  it('should throw when THIRD_PARTY_BASE_URL is missing', () => {
    delete process.env.THIRD_PARTY_BASE_URL;

    expect(() => getSyncConfig()).toThrow('Missing required environment variable: THIRD_PARTY_BASE_URL');
  });
});
