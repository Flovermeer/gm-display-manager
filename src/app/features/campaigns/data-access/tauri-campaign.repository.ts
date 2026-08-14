/**
 * But
 * Persiste les campagnes dans SQLite via Tauri.
 *
 * Responsabilités
 * - exécute les requêtes de campagne ;
 * - convertit les lignes SQLite vers le modèle de domaine ;
 */

import { Injectable } from '@angular/core';
import Database from '@tauri-apps/plugin-sql';

import type { Campaign } from '@app/features/campaigns/domain/campaign';
import { CampaignRepository } from '@app/features/campaigns/data-access/campaign.repository';

const DATABASE_URL = 'sqlite:beholders-inn.db';

type CampaignRow = Readonly<{
  id: string;
  name: string;
  description: string;
  universe_id: string;
  created_at: string;
  updated_at: string;
}>;

@Injectable()
export class TauriCampaignRepository extends CampaignRepository {
  private databasePromise?: Promise<Database>;

  override async list(): Promise<readonly Campaign[]> {
    const database = await this.getDatabase();
    const rows = await database.select<CampaignRow[]>(
      `SELECT id, name, description, universe_id, created_at, updated_at
       FROM campaign
       ORDER BY name COLLATE NOCASE, id`,
    );

    return rows.map(mapCampaignRow);
  }

  override async findById(id: string): Promise<Campaign | null> {
    const database = await this.getDatabase();
    const rows = await database.select<CampaignRow[]>(
      `SELECT id, name, description, universe_id, created_at, updated_at
       FROM campaign
       WHERE id = $1`,
      [id],
    );

    return rows[0] ? mapCampaignRow(rows[0]) : null;
  }

  override async save(campaign: Campaign): Promise<void> {
    const database = await this.getDatabase();
    await database.execute(
      `INSERT INTO campaign (
         id, name, description, system_key, created_at, updated_at, universe_id
       ) VALUES ($1, $2, $3, (SELECT game_system_id FROM game_universe WHERE id = $4), $5, $6, $4)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         description = excluded.description,
         updated_at = excluded.updated_at`,
      [
        campaign.id,
        campaign.name,
        campaign.description,
        campaign.universeId,
        campaign.createdAt,
        campaign.updatedAt,
      ],
    );
  }

  override async delete(id: string): Promise<void> {
    const database = await this.getDatabase();
    await database.execute('DELETE FROM campaign WHERE id = $1', [id]);
  }

  private getDatabase(): Promise<Database> {
    this.databasePromise ??= Database.load(DATABASE_URL).catch((error: unknown) => {
      this.databasePromise = undefined;
      throw error;
    });

    return this.databasePromise;
  }
}

function mapCampaignRow(row: CampaignRow): Campaign {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    universeId: row.universe_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
