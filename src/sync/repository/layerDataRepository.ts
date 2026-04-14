import type { Logger } from '@map-colonies/js-logger';
import type { DeprecatedObject, LayerObject } from '../types';

export function handleNewObjects(logger: Logger, layerName: string, objects: LayerObject[]): void {
  if (objects.length === 0) {
    return;
  }

  logger.info(`Inserting ${objects.length} new objects into layer "${layerName}"`);

  // TODO: batch upsert into DB using INSERT ... VALUES (unnest)
  //   INSERT INTO {layerName} (id, geometry, properties, created_at, updated_at)
  //   SELECT unnest($1::text[]), unnest($2::jsonb[]), unnest($3::jsonb[]), NOW(), NOW()
  //   ON CONFLICT (id) DO UPDATE SET geometry = EXCLUDED.geometry, properties = EXCLUDED.properties, updated_at = NOW()
}

export function handleDeprecatedObjects(logger: Logger, layerName: string, deprecated: DeprecatedObject[]): void {
  if (deprecated.length === 0) {
    return;
  }

  logger.info(`Updating ${deprecated.length} deprecated objects in layer "${layerName}"`);

  // TODO: batch update using a single query with unnest
  //   UPDATE {layerName} AS t
  //   SET properties = t.properties || v.updated_fields, updated_at = NOW()
  //   FROM (SELECT unnest($1::text[]) AS id, unnest($2::jsonb[]) AS updated_fields) AS v
  //   WHERE t.id = v.id
}
