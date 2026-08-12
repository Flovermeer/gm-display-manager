import { Injectable } from '@angular/core';
import Database from '@tauri-apps/plugin-sql';

import type { Campaign } from '../campaign/campaign';
import { CampaignRepository } from '../campaign/campaign.repository';

const DATABASE_URL = 'sqlite:beholders-inn.db';

type CampaignRow = Readonly<{
  id: string;
  name: string;
  description: string;
  system_key: string;
  created_at: string;
  updated_at: string;
}>;

@Injectable()
export class TauriCampaignRepository extends CampaignRepository {
  private databasePromise?: Promise<Database>;

  override async list(): Promise<readonly Campaign[]> {
    const database = await this.getDatabase();
    const rows = await database.select<CampaignRow[]>(
      `SELECT id, name, description, system_key, created_at, updated_at
       FROM campaign
       ORDER BY name COLLATE NOCASE, id`,
    );

    return rows.map(mapCampaignRow);
  }

  override async findById(id: string): Promise<Campaign | null> {
    const database = await this.getDatabase();
    const rows = await database.select<CampaignRow[]>(
      `SELECT id, name, description, system_key, created_at, updated_at
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
         id, name, description, system_key, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         description = excluded.description,
         system_key = excluded.system_key,
         updated_at = excluded.updated_at`,
      [
        campaign.id,
        campaign.name,
        campaign.description,
        campaign.systemKey,
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
    systemKey: row.system_key,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
