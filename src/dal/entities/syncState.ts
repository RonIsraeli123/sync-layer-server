import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

export enum SyncStatus {
  SYNCING = 'SYNCING',
  READY = 'READY',
}

@Entity('sync_state')
export class SyncStateEntry {
  @PrimaryColumn({ name: 'layer_name', type: 'text' })
  layerName!: string;

  @Column({ type: 'text', default: SyncStatus.SYNCING })
  status!: SyncStatus;

  @Column({ name: 'last_offset', type: 'integer', default: 0 })
  lastOffset!: number;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
