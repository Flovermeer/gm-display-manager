import { Injectable } from '@angular/core';
import Database from '@tauri-apps/plugin-sql';

import type { Location } from '../location/location';
import { LocationRepository } from '../location/location.repository';

const DATABASE_URL = 'sqlite:beholders-inn.db';

type LocationRow = Readonly<{
  id: string;
  campaign_id: string;
  parent_location_id: string | null;
  name: string;
  summary: string;
  notes: string;
  image_path: string | null;
  created_at: string;
  updated_at: string;
}>;

@Injectable()
export class TauriLocationRepository extends LocationRepository {
  private databasePromise?: Promise<Database>;

  override async listByCampaign(campaignId: string): Promise<readonly Location[]> {
    const database = await this.getDatabase();
    const rows = await database.select<LocationRow[]>(
      `${LOCATION_COLUMNS}
       FROM location
       WHERE campaign_id = $1
       ORDER BY name COLLATE NOCASE, id`,
      [campaignId],
    );

    return rows.map(mapLocationRow);
  }

  override async findById(campaignId: string, id: string): Promise<Location | null> {
    const database = await this.getDatabase();
    const rows = await database.select<LocationRow[]>(
      `${LOCATION_COLUMNS}
       FROM location
       WHERE campaign_id = $1 AND id = $2`,
      [campaignId, id],
    );

    return rows[0] ? mapLocationRow(rows[0]) : null;
  }

  override async save(location: Location): Promise<void> {
    const database = await this.getDatabase();
    await database.execute(
      `INSERT INTO location (
         id, campaign_id, parent_location_id, name, summary, notes, image_path,
         created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT(id) DO UPDATE SET
         parent_location_id = excluded.parent_location_id,
         name = excluded.name,
         summary = excluded.summary,
         notes = excluded.notes,
         image_path = excluded.image_path,
         updated_at = excluded.updated_at
       WHERE location.campaign_id = excluded.campaign_id`,
      [
        location.id,
        location.campaignId,
        location.parentLocationId,
        location.name,
        location.summary,
        location.notes,
        location.imagePath,
        location.createdAt,
        location.updatedAt,
      ],
    );
  }

  override async delete(campaignId: string, id: string): Promise<void> {
    const database = await this.getDatabase();
    await database.execute('DELETE FROM location WHERE campaign_id = $1 AND id = $2', [
      campaignId,
      id,
    ]);
  }

  private getDatabase(): Promise<Database> {
    this.databasePromise ??= Database.load(DATABASE_URL).catch((error: unknown) => {
      this.databasePromise = undefined;
      throw error;
    });

    return this.databasePromise;
  }
}

const LOCATION_COLUMNS = `SELECT id, campaign_id, parent_location_id, name,
                                 summary, notes, image_path, created_at, updated_at`;

function mapLocationRow(row: LocationRow): Location {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    parentLocationId: row.parent_location_id,
    name: row.name,
    summary: row.summary,
    notes: row.notes,
    imagePath: row.image_path,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
