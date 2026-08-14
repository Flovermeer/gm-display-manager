/**
 * But
 * Persiste les types et raretés d’objets dans SQLite.
 *
 * Responsabilités
 * - traduit les options configurables entre SQLite et le domaine ;
 */

import { Injectable } from '@angular/core';
import Database from '@tauri-apps/plugin-sql';

import type {
  ItemConfigurationKind,
  ItemConfigurationOption,
} from '@app/features/items/domain/item-configuration';
import { ItemConfigurationRepository } from '@app/features/items/data-access/item-configuration.repository';

const DATABASE_URL = 'sqlite:beholders-inn.db';
type OptionRow = Readonly<{
  id: string;
  campaign_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}>;

@Injectable()
export class TauriItemConfigurationRepository extends ItemConfigurationRepository {
  private databasePromise?: Promise<Database>;

  override async list(campaignId: string, kind: ItemConfigurationKind) {
    const rows = await (
      await this.database()
    ).select<OptionRow[]>(
      `SELECT id, campaign_id, name, created_at, updated_at FROM ${table(kind)}
       WHERE campaign_id = $1 ORDER BY name COLLATE NOCASE, id`,
      [campaignId],
    );
    return rows.map((row) => mapRow(row, kind));
  }

  override async findById(campaignId: string, kind: ItemConfigurationKind, id: string) {
    const rows = await (
      await this.database()
    ).select<OptionRow[]>(
      `SELECT id, campaign_id, name, created_at, updated_at FROM ${table(kind)}
       WHERE campaign_id = $1 AND id = $2`,
      [campaignId, id],
    );
    return rows[0] ? mapRow(rows[0], kind) : null;
  }

  override async save(option: ItemConfigurationOption): Promise<void> {
    await (
      await this.database()
    ).execute(
      `INSERT INTO ${table(option.kind)} (id, campaign_id, name, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT(id) DO UPDATE SET name = excluded.name, updated_at = excluded.updated_at
       WHERE campaign_id = excluded.campaign_id`,
      [option.id, option.campaignId, option.name, option.createdAt, option.updatedAt],
    );
  }

  override async delete(campaignId: string, kind: ItemConfigurationKind, id: string) {
    await (
      await this.database()
    ).execute(`DELETE FROM ${table(kind)} WHERE campaign_id = $1 AND id = $2`, [campaignId, id]);
  }

  private database(): Promise<Database> {
    this.databasePromise ??= Database.load(DATABASE_URL).catch((error: unknown) => {
      this.databasePromise = undefined;
      throw error;
    });
    return this.databasePromise;
  }
}

function table(kind: ItemConfigurationKind): 'item_type' | 'item_rarity' {
  return kind === 'type' ? 'item_type' : 'item_rarity';
}

function mapRow(row: OptionRow, kind: ItemConfigurationKind): ItemConfigurationOption {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    kind,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
