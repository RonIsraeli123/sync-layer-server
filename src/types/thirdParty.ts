export type { LayerObject, DeprecatedObject } from '../dal/entities/layerObject';

export interface ThirdPartyResponse {
  totalCount: number;
  returnedCount: number;
  nextRecord: number;
  objects: LayerObject[];
  deprecated: DeprecatedObject[];
}
