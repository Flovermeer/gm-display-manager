/**
 * But
 * Gère les catalogues canoniques d'univers dans SQLite.
 *
 * Responsabilités
 * - exclut les ressources locales aux campagnes ;
 * - compte les campagnes utilisatrices ;
 * - applique la corbeille et la restauration sans rompre les associations existantes.
 */

import { Injectable } from '@angular/core';
import Database from '@tauri-apps/plugin-sql';

import { UniverseResourceRepository } from '@app/features/game-systems/data-access/universe-resource.repository';
import type {
  UniverseResourceSummary,
  UniverseResourceType,
} from '@app/features/game-systems/domain/universe-resource';

const DATABASE_URL = 'sqlite:beholders-inn.db';

type SummaryRow = Readonly<{
  id: string;
  universe_id: string;
  name: string;
  summary: string;
  campaign_count: number;
  deleted_at: string | null;
}>;

@Injectable()
export class TauriUniverseResourceRepository extends UniverseResourceRepository {
  private databasePromise?: Promise<Database>;

  override async list(
    universeId: string,
    type: UniverseResourceType,
  ): Promise<readonly UniverseResourceSummary[]> {
    const descriptor = DESCRIPTORS[type];
    const rows = await (
      await this.database()
    ).select<SummaryRow[]>(
      `SELECT resource.id, resource.universe_id, resource.name,
              ${descriptor.summaryExpression} AS summary,
              COUNT(association.${descriptor.associationCampaignColumn}) AS campaign_count,
              resource.deleted_at
       FROM ${descriptor.table} AS resource
       LEFT JOIN ${descriptor.associationTable} AS association
         ON association.${descriptor.associationResourceColumn}=resource.id
       WHERE resource.universe_id=$1 AND resource.source_campaign_id IS NULL
       GROUP BY resource.id
       ORDER BY resource.deleted_at IS NOT NULL, resource.name COLLATE NOCASE, resource.id`,
      [universeId],
    );
    return rows.map((row) => ({
      id: row.id,
      universeId: row.universe_id,
      type,
      name: row.name,
      summary: row.summary,
      campaignCount: row.campaign_count,
      deletedAt: row.deleted_at,
    }));
  }

  override trash(universeId: string, type: UniverseResourceType, id: string): Promise<void> {
    return this.setDeletedAt(universeId, type, id, 'CURRENT_TIMESTAMP');
  }

  override restore(universeId: string, type: UniverseResourceType, id: string): Promise<void> {
    return this.setDeletedAt(universeId, type, id, 'NULL');
  }

  private async setDeletedAt(
    universeId: string,
    type: UniverseResourceType,
    id: string,
    value: 'CURRENT_TIMESTAMP' | 'NULL',
  ): Promise<void> {
    const result = await (
      await this.database()
    ).execute(
      `UPDATE ${DESCRIPTORS[type].table}
       SET deleted_at=${value}, updated_at=CURRENT_TIMESTAMP
       WHERE id=$2 AND universe_id=$1 AND source_campaign_id IS NULL`,
      [universeId, id],
    );
    if (result.rowsAffected === 0) {
      throw new Error("Cette ressource canonique n'existe plus dans l'univers.");
    }
  }

  private database(): Promise<Database> {
    this.databasePromise ??= Database.load(DATABASE_URL).catch((error: unknown) => {
      this.databasePromise = undefined;
      throw error;
    });
    return this.databasePromise;
  }
}

const DESCRIPTORS: Readonly<
  Record<
    UniverseResourceType,
    Readonly<{
      table: string;
      associationTable: string;
      associationResourceColumn: string;
      associationCampaignColumn: string;
      summaryExpression: string;
    }>
  >
> = {
  npc: {
    table: 'npc',
    associationTable: 'campaign_npc',
    associationResourceColumn: 'npc_id',
    associationCampaignColumn: 'campaign_id',
    summaryExpression: "COALESCE(json_extract(resource.sheet_json, '$.creatureType'), '')",
  },
  'player-character': {
    table: 'player_character',
    associationTable: 'campaign_player_character',
    associationResourceColumn: 'player_character_id',
    associationCampaignColumn: 'campaign_id',
    summaryExpression:
      "TRIM(COALESCE(json_extract(resource.sheet_json, '$.species'), '') || ' ' || COALESCE(json_extract(resource.sheet_json, '$.className'), ''))",
  },
  location: {
    table: 'location',
    associationTable: 'campaign_location',
    associationResourceColumn: 'location_id',
    associationCampaignColumn: 'campaign_id',
    summaryExpression: 'resource.summary',
  },
  item: {
    table: 'narrative_item',
    associationTable: 'campaign_narrative_item',
    associationResourceColumn: 'item_id',
    associationCampaignColumn: 'campaign_id',
    summaryExpression: 'resource.summary',
  },
  monster: {
    table: 'monster',
    associationTable: 'campaign_monster',
    associationResourceColumn: 'monster_id',
    associationCampaignColumn: 'campaign_id',
    summaryExpression: "COALESCE(json_extract(resource.sheet_json, '$.creatureType'), '')",
  },
};
