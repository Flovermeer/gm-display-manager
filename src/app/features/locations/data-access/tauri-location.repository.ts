/**
 * But
 * Persiste les lieux dans SQLite via Tauri.
 *
 * Responsabilités
 * - exécute les requêtes de lieu ;
 * - convertit les lignes SQLite vers le domaine ;
 */

import { Injectable } from '@angular/core';
import Database from '@tauri-apps/plugin-sql';

import type { Location } from '@app/features/locations/domain/location';
import { LocationRepository } from '@app/features/locations/data-access/location.repository';

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
       FROM campaign_location
       JOIN location ON location.id = campaign_location.location_id
       WHERE campaign_location.campaign_id = $1
       ORDER BY location.name COLLATE NOCASE, location.id`,
      [campaignId],
    );

    return rows.map(mapLocationRow);
  }

  override async findById(campaignId: string, id: string): Promise<Location | null> {
    const database = await this.getDatabase();
    const rows = await database.select<LocationRow[]>(
      `${LOCATION_COLUMNS}
       FROM campaign_location
       JOIN location ON location.id = campaign_location.location_id
       WHERE campaign_location.campaign_id = $1 AND location.id = $2`,
      [campaignId, id],
    );

    return rows[0] ? mapLocationRow(rows[0]) : null;
  }

  override async save(location: Location): Promise<void> {
    const database = await this.getDatabase();
    await database.execute(
      `INSERT INTO location (
         id, universe_id, parent_location_id, name, summary, image_path, created_at, updated_at
       ) VALUES ($1, (SELECT universe_id FROM campaign WHERE id=$2), $3, $4, $5, $6, $7, $8)
       ON CONFLICT(id) DO UPDATE SET
         parent_location_id = excluded.parent_location_id,
         name = excluded.name,
         summary = excluded.summary,
         image_path = excluded.image_path,
         updated_at = excluded.updated_at
       WHERE location.universe_id = excluded.universe_id`,
      [
        location.id,
        location.campaignId,
        location.parentLocationId,
        location.name,
        location.summary,
        location.imagePath,
        location.createdAt,
        location.updatedAt,
      ],
    );
    await database.execute(
      `INSERT INTO campaign_location(campaign_id, location_id, created_at)
       VALUES ($1, $2, $3) ON CONFLICT(campaign_id, location_id) DO NOTHING`,
      [location.campaignId, location.id, location.createdAt],
    );
  }

  override async delete(campaignId: string, id: string): Promise<void> {
    const database = await this.getDatabase();
    await database.execute('DELETE FROM campaign_location WHERE campaign_id = $1 AND location_id = $2', [
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

const LOCATION_COLUMNS = `SELECT location.id, campaign_location.campaign_id,
                                 location.parent_location_id, location.name,
                                 location.summary, '' AS notes, location.image_path,
                                 location.created_at, location.updated_at`;

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
