import type { Logger } from '@map-colonies/js-logger';
import type { DeprecatedObject, LayerObject } from '../types';

export function handleNewObjects(logger: Logger, layerName: string, objects: LayerObject[]): void {
  if (objects.length === 0) {
    return;
  }

  logger.info(`Inserting ${objects.length} new objects into layer "${layerName}"`);

  // TODO: insert to the DB
}

export function handleDeprecatedObjects(logger: Logger, layerName: string, deprecated: DeprecatedObject[]): void {
  if (deprecated.length === 0) {
    return;
  }

  logger.info(`Updating ${deprecated.length} deprecated objects in layer "${layerName}"`);

  // TODO: update in the DB
}
