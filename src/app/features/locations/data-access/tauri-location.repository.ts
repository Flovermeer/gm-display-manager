/**
 * But
 * Persiste les lieux partagés et leur hiérarchie dans SQLite.
 *
 * Responsabilités
 * - projette une fiche canonique dans le contexte de la campagne ;
 * - conserve les personnalisations de campagne sous forme de snapshot ;
 * - maintient la chaîne des lieux parents lors d'un import ou d'une promotion.
 */

import { Injectable } from '@angular/core';
import { invoke } from '@tauri-apps/api/core';
import Database from '@tauri-apps/plugin-sql';

import type { Location } from '@app/features/locations/domain/location';
import { LocationRepository } from '@app/features/locations/data-access/location.repository';
import {
  createEmptyRichTextDocument,
  type RichTextDocument,
} from '@app/shared/rich-text-editor/rich-text-document';

const DATABASE_URL = 'sqlite:beholders-inn.db';

type LocationRow = Readonly<{
  id: string;
  campaign_id: string;
  parent_location_id: string | null;
  name: string;
  summary: string;
  description_json: string;
  notes: string;
  image_path: string | null;
  image_paths_json: string;
  created_at: string;
  updated_at: string;
  source_campaign_id: string | null;
  override_snapshot: string | null;
}>;

@Injectable()
export class TauriLocationRepository extends LocationRepository {
  private databasePromise?: Promise<Database>;

  override listByCampaign(campaignId: string): Promise<readonly Location[]> {
    return this.select(
      `${LOCATION_COLUMNS}
       FROM campaign_location
       JOIN location ON location.id=campaign_location.location_id
       LEFT JOIN campaign_resource_override AS resource_override
         ON resource_override.campaign_id=campaign_location.campaign_id
        AND resource_override.resource_type='location'
        AND resource_override.resource_id=location.id
       WHERE campaign_location.campaign_id=$1
         AND NOT (location.source_campaign_id=$1 AND location.deleted_at IS NOT NULL)
       ORDER BY location.name COLLATE NOCASE, location.id`,
      [campaignId],
    );
  }

  override listAvailableByCampaign(campaignId: string): Promise<readonly Location[]> {
    return this.select(
      `SELECT location.id, campaign.id AS campaign_id, location.parent_location_id,
              location.name, location.summary,
              '${EMPTY_DESCRIPTION_JSON}' AS description_json,
              '' AS notes, location.image_path,
              ${LOCATION_IMAGES_JSON} AS image_paths_json,
              location.created_at, location.updated_at, location.source_campaign_id,
              NULL AS override_snapshot
       FROM campaign JOIN location ON location.universe_id=campaign.universe_id
       WHERE campaign.id=$1 AND location.source_campaign_id IS NULL
         AND location.deleted_at IS NULL
         AND NOT EXISTS (
           SELECT 1 FROM campaign_location
           WHERE campaign_location.campaign_id=campaign.id
             AND campaign_location.location_id=location.id
         )
       ORDER BY location.name COLLATE NOCASE, location.id`,
      [campaignId],
    );
  }

  override async findById(campaignId: string, id: string): Promise<Location | null> {
    const locations = await this.select(
      `${LOCATION_COLUMNS}
       FROM campaign_location
       JOIN location ON location.id=campaign_location.location_id
       LEFT JOIN campaign_resource_override AS resource_override
         ON resource_override.campaign_id=campaign_location.campaign_id
        AND resource_override.resource_type='location'
        AND resource_override.resource_id=location.id
       WHERE campaign_location.campaign_id=$1 AND location.id=$2`,
      [campaignId, id],
    );
    return locations[0] ?? null;
  }

  override async save(location: Location): Promise<void> {
    await this.database();
    await invoke('save_location_transaction', {
      input: {
        id: location.id,
        campaignId: location.campaignId,
        parentLocationId: location.parentLocationId,
        name: location.name,
        summary: location.summary,
        descriptionJson: JSON.stringify(location.description),
        imagePath: location.imagePath,
        imagePaths: location.imagePaths,
        createdAt: location.createdAt,
        updatedAt: location.updatedAt,
        overrideSnapshotJson:
          location.provenance === 'campaign' ? null : JSON.stringify(snapshot(location)),
      },
    });
  }

  override async delete(campaignId: string, id: string): Promise<void> {
    const database = await this.database();
    const local = await database.execute(
      `UPDATE location SET deleted_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP
       WHERE id=$2 AND source_campaign_id=$1`,
      [campaignId, id],
    );
    if (local.rowsAffected > 0) {
      await database.execute(
        `UPDATE location SET parent_location_id=NULL, updated_at=CURRENT_TIMESTAMP
         WHERE parent_location_id=$2 AND source_campaign_id=$1`,
        [campaignId, id],
      );
      return;
    }

    await database.execute(
      `DELETE FROM campaign_resource_override
       WHERE campaign_id=$1 AND resource_type='location' AND resource_id=$2`,
      [campaignId, id],
    );
    await database.execute(
      'DELETE FROM campaign_location WHERE campaign_id=$1 AND location_id=$2',
      [campaignId, id],
    );
  }

  override async attach(campaignId: string, id: string): Promise<void> {
    const database = await this.database();
    const result = await database.execute(
      `WITH RECURSIVE ancestors(id, parent_location_id) AS (
         SELECT location.id, location.parent_location_id
         FROM campaign JOIN location ON location.id=$2
         WHERE campaign.id=$1 AND campaign.universe_id=location.universe_id
           AND location.source_campaign_id IS NULL AND location.deleted_at IS NULL
         UNION ALL
         SELECT parent.id, parent.parent_location_id
         FROM location AS parent
         JOIN ancestors ON parent.id=ancestors.parent_location_id
         WHERE parent.source_campaign_id IS NULL AND parent.deleted_at IS NULL
       )
       INSERT INTO campaign_location(campaign_id, location_id, created_at)
       SELECT $1, id, CURRENT_TIMESTAMP FROM ancestors WHERE true
       ON CONFLICT(campaign_id, location_id) DO NOTHING`,
      [campaignId, id],
    );
    if (result.rowsAffected === 0 && !(await this.findById(campaignId, id))) {
      throw new Error("Ce lieu n'appartient pas à l'univers de la campagne.");
    }
  }

  override async promotionPlan(campaignId: string, id: string): Promise<readonly Location[]> {
    const locations = await this.listByCampaign(campaignId);
    const byId = new Map(locations.map((location) => [location.id, location]));
    const plan: Location[] = [];
    let current = byId.get(id);
    const visited = new Set<string>();
    while (current?.provenance === 'campaign' && !visited.has(current.id)) {
      visited.add(current.id);
      plan.unshift(current);
      current = current.parentLocationId ? byId.get(current.parentLocationId) : undefined;
    }
    return plan;
  }

  override async promote(campaignId: string, id: string): Promise<void> {
    const result = await (
      await this.database()
    ).execute(
      `WITH RECURSIVE ancestors(id, parent_location_id) AS (
         SELECT id, parent_location_id FROM location
         WHERE id=$2 AND source_campaign_id=$1 AND deleted_at IS NULL
         UNION ALL
         SELECT parent.id, parent.parent_location_id
         FROM location AS parent
         JOIN ancestors ON parent.id=ancestors.parent_location_id
         WHERE parent.source_campaign_id=$1 AND parent.deleted_at IS NULL
       )
       UPDATE location
       SET source_campaign_id=NULL, deleted_at=NULL, updated_at=CURRENT_TIMESTAMP
       WHERE id IN (SELECT id FROM ancestors)`,
      [campaignId, id],
    );
    if (result.rowsAffected === 0) {
      throw new Error("Seul un lieu local peut être enregistré dans l'univers.");
    }
  }

  override async resetOverride(campaignId: string, id: string): Promise<void> {
    await (
      await this.database()
    ).execute(
      `DELETE FROM campaign_resource_override
       WHERE campaign_id=$1 AND resource_type='location' AND resource_id=$2`,
      [campaignId, id],
    );
  }

  private async select(query: string, values: readonly unknown[]): Promise<readonly Location[]> {
    const rows = await (await this.database()).select<LocationRow[]>(query, [...values]);
    return rows.map(mapLocationRow);
  }

  private database(): Promise<Database> {
    this.databasePromise ??= Database.load(DATABASE_URL).catch((error: unknown) => {
      this.databasePromise = undefined;
      throw error;
    });
    return this.databasePromise;
  }
}

const LOCATION_IMAGES_JSON = `COALESCE((
  SELECT json_group_array(ordered_image.image_path)
  FROM (
    SELECT location_image.image_path
    FROM location_image
    WHERE location_image.location_id=location.id
    ORDER BY location_image.position, location_image.rowid
  ) AS ordered_image
), '[]')`;

const LOCATION_COLUMNS = `SELECT location.id, campaign_location.campaign_id,
  location.parent_location_id, location.name, location.summary,
  campaign_location.description_json, '' AS notes,
  location.image_path, ${LOCATION_IMAGES_JSON} AS image_paths_json,
  location.created_at, location.updated_at,
  location.source_campaign_id, resource_override.snapshot_json AS override_snapshot`;

function mapLocationRow(row: LocationRow): Location {
  const override = row.override_snapshot
    ? (JSON.parse(row.override_snapshot) as ReturnType<typeof snapshot>)
    : null;
  const imagePaths = parseImagePaths(row.image_paths_json, row.image_path);
  return {
    id: row.id,
    campaignId: row.campaign_id,
    provenance: row.source_campaign_id ? 'campaign' : override ? 'override' : 'universe',
    parentLocationId: override?.parentLocationId ?? row.parent_location_id,
    name: override?.name ?? row.name,
    summary: override?.summary ?? row.summary,
    description: parseDescription(row.description_json),
    notes: row.notes,
    imagePaths,
    imagePath: imagePaths[0] ?? null,
    createdAt: row.created_at,
    updatedAt: override?.updatedAt ?? row.updated_at,
  };
}

function parseImagePaths(value: string, fallback: string | null): readonly string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed)) {
      const paths = parsed.filter((path): path is string => typeof path === 'string' && !!path);
      if (paths.length > 0) return [...new Set(paths)];
    }
  } catch {
    // Le chemin historique reste disponible si la galerie ne peut pas être lue.
  }
  return fallback ? [fallback] : [];
}

const EMPTY_DESCRIPTION_JSON = JSON.stringify(createEmptyRichTextDocument()).replaceAll("'", "''");

function parseDescription(value: string): RichTextDocument {
  try {
    const parsed = JSON.parse(value) as Partial<RichTextDocument>;
    if (parsed.schemaVersion === 1 && parsed.content?.type === 'doc') {
      return parsed as RichTextDocument;
    }
  } catch {
    // Une description invalide ne doit pas empêcher l'ouverture de la campagne.
  }
  return createEmptyRichTextDocument();
}

function snapshot(location: Location) {
  return {
    parentLocationId: location.parentLocationId,
    name: location.name,
    summary: location.summary,
    imagePath: location.imagePath,
    updatedAt: location.updatedAt,
  };
}
