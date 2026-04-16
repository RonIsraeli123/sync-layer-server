# Unit Tests Summary

Total: 44 tests across 9 test files.

## Overview

| Test File | Module Tested | Tests | What It Covers |
|---|---|---|---|
| `syncConfig.spec.ts` | `src/common/syncConfig.ts` | 7 | Env-based sync configuration loading and validation |
| `layerClient.spec.ts` | `src/graphql/api/layerClient.ts` | 5 | GraphQL HTTP client for fetching layer pages |
| `connection.spec.ts` | `src/dal/connection.ts` | 7 | TypeORM DataSource lifecycle (create, init, close) |
| `syncStateRepository.spec.ts` | `src/dal/repositories/syncStateRepository.ts` | 7 | CRUD operations on the sync_state table |
| `layerDataRepository.spec.ts` | `src/dal/repositories/layerDataRepository.ts` | 4 | Upsert and JSONB merge on the layer_obstacles table |
| `layerSyncHandler.spec.ts` | `src/handler/layerSyncHandler.ts` | 7 | Single sync tick orchestration logic |
| `syncManager.spec.ts` | `src/scheduler/syncManager.ts` | 4 | Heap-based scheduler loop and lifecycle |
| `resourceNameModel.spec.ts` | `src/resourceName/models/resourceNameManager.ts` | 2 | Template resource CRUD (pre-existing) |
| `anotherResourceManager.spec.ts` | `src/anotherResource/models/anotherResourceManager.ts` | 1 | Template resource getter (pre-existing) |

---

## syncConfig (`tests/unit/common/syncConfig.spec.ts`)

This file tests `getSyncConfig()` which reads all sync-related settings from environment variables. It verifies that env vars are correctly parsed and that missing vars cause an immediate error.

- **should return values from environment variables** - When all required env vars are set, the function returns the correct config object with layers, intervals, page size, and API URL.
- **should parse SYNC_LAYERS as comma-separated list** - The `SYNC_LAYERS` env var is correctly split by commas into an array of layer names.
- **should parse numeric env vars** - String-based numeric env vars like `SYNC_INTERVAL_MS` and `SYNC_PAGE_SIZE` are properly converted to numbers.
- **should use custom THIRD_PARTY_BASE_URL when set** - The third-party GraphQL URL is taken from the environment variable as-is.
- **should throw when SYNC_LAYERS is missing** - Calling `getSyncConfig()` without `SYNC_LAYERS` defined throws a descriptive error.
- **should throw when SYNC_INTERVAL_MS is missing** - Calling `getSyncConfig()` without `SYNC_INTERVAL_MS` defined throws a descriptive error.
- **should throw when THIRD_PARTY_BASE_URL is missing** - Calling `getSyncConfig()` without `THIRD_PARTY_BASE_URL` defined throws a descriptive error.

---

## layerClient (`tests/unit/graphql/layerClient.spec.ts`)

This file tests `fetchPage()` which sends a GraphQL POST request to the third-party API and parses the response. It mocks the global `fetch` to verify request shape and all error paths.

- **should send correct GraphQL request and return parsed response** - Verifies the POST request has the right URL, headers, and body, and that the layer page data is correctly extracted from the response.
- **should throw on non-ok HTTP response** - A non-200 HTTP status from the API results in a descriptive error being thrown.
- **should throw on GraphQL errors** - When the response body contains a GraphQL `errors` array, the function throws instead of returning partial data.
- **should throw when no data is returned** - A response with no `data` field throws a clear error, covering empty or malformed API responses.
- **should pass offset and pageSize in variables** - The GraphQL query variables include the correct `layerName`, `offset`, and `pageSize` values from the caller and config.

---

## dal/connection (`tests/unit/dal/connection.spec.ts`)

This file tests the TypeORM DataSource lifecycle functions: creating, initializing, retrieving, and closing the database connection. It mocks the `DataSource` class and uses env stubs to test configuration.

- **createDataSource should create a DataSource with env-based config** - Reads all `DB_*` env vars and passes them correctly to the TypeORM DataSource constructor.
- **createDataSource should enable SSL when DB_SSL is true** - Setting `DB_SSL=true` configures the DataSource with `ssl: { rejectUnauthorized: false }`.
- **createDataSource should throw when required env vars are missing** - A missing or empty required env var like `DB_HOST` causes an immediate error with a descriptive message.
- **initializeDb should create and initialize data source** - Calling `initializeDb` creates a DataSource and calls `.initialize()` on it, resulting in an active connection.
- **getDataSource should throw when not initialized** - Calling `getDataSource` before `initializeDb` throws a clear "not initialized" error.
- **closeDb should destroy data source when initialized** - Calls `.destroy()` on an active DataSource to properly close the connection pool.
- **closeDb should do nothing when not initialized** - Calling `closeDb` without an active connection is a safe no-op and does not throw.

---

## syncStateRepository (`tests/unit/dal/repositories/syncStateRepository.spec.ts`)

This file tests all CRUD operations on the `sync_state` table. It mocks the TypeORM repository and query builder chain to verify the correct SQL operations are triggered.

- **should insert a row for each layer with SYNCING status and offset 0** - `initializeSyncState` creates one row per layer with status SYNCING and offset 0, using INSERT with ON CONFLICT IGNORE.
- **should handle empty layers array** - Passing an empty array does not trigger any database queries.
- **should return the sync state for a layer** - `getSyncState` queries by layer name and returns the matching entry from the database.
- **should throw when layer not found** - `getSyncState` throws a descriptive error when no row exists for the requested layer name.
- **should return all sync states** - `getAllSyncStates` returns every sync state row from the repository.
- **should update the offset for a given layer** - `updateOffset` calls the repository update with the correct layer name and new offset value.
- **should update the status for a given layer** - `setStatus` correctly updates the status column for the specified layer.

---

## layerDataRepository (`tests/unit/dal/repositories/layerDataRepository.spec.ts`)

This file tests bulk insert and update operations on the `layer_obstacles` table. It mocks the TypeORM query builder to verify upsert behavior and JSONB merge logic.

- **should do nothing when objects array is empty (insertObjects)** - `insertObjects` short-circuits and makes no database calls when given an empty array.
- **should upsert objects with conflict on id** - Performs an INSERT with ON CONFLICT UPDATE on the `id` column, updating `geometry` and `properties` for existing rows.
- **should do nothing when deprecated array is empty** - `updateDeprecatedObjects` skips all database work when there are no deprecated objects.
- **should update each deprecated object with JSONB merge** - Each deprecated object triggers a separate UPDATE query that merges `updatedFields` into the existing `properties` JSONB column.

---

## layerSyncHandler (`tests/unit/handler/layerSyncHandler.spec.ts`)

This file tests `fetchAndSyncLayerPage()` which orchestrates a single sync tick: load state, fetch data, persist it, and schedule the next run. It mocks the repositories, GraphQL client, and config.

- **should fetch page, insert objects, update deprecated, and advance offset** - The full happy path: loads sync state, fetches a page, inserts new objects, updates deprecated ones, and advances the offset.
- **should not insert when objects array is empty** - When the API returns no objects or deprecated items, the handler skips both insert and update calls.
- **should set status to READY when SYNCING and no objects returned** - When a layer is still SYNCING but receives zero objects, its status transitions to READY.
- **should NOT set status to READY when already READY** - Layers already in READY status are not redundantly updated, even when they receive an empty page.
- **should set nextRunAt with syncIntervalMs when still SYNCING** - During initial sync, the next run is scheduled using the fast sync interval (500ms).
- **should set nextRunAt with pollIntervalMs when READY** - Once a layer is READY, the next run is scheduled using the slower poll interval (600s).
- **should log error and still update nextRunAt when fetchPage throws** - A network error during fetch is caught and logged, and the entry is still rescheduled so the loop continues.

---

## SyncManager (`tests/unit/scheduler/syncManager.spec.ts`)

This file tests the `SyncManager` class which runs a min-heap-based scheduler loop, sleeping between layers and delegating each tick to the sync handler. It uses fake timers to control async flow.

- **should initialize sync state for configured layers on start** - `start()` calls `initializeSyncState` with the layer names from config before entering the scheduler loop.
- **should schedule all layers and call fetchAndSyncLayerPage** - After starting, the manager picks the first due layer from the heap and invokes the sync handler for it.
- **should stop the scheduler loop when stop is called** - Calling `stop()` aborts the sleep timer and cleanly exits the scheduler loop.
- **should log info about layers on start** - The manager logs which layers are being initialized and their current sync status when starting up.
