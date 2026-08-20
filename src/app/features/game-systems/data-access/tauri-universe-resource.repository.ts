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
  UniverseLocationDetail,
  UniverseMonsterDetail,
  UniverseNarrativeItemDetail,
  UniverseNpcDetail,
  UniversePlayerCharacterDetail,
  UniverseResourceDetail,
  UniverseResourceSummary,
  UniverseResourceType,
} from '@app/features/game-systems/domain/universe-resource';
import { normalizeNpcSheet } from '@app/features/npcs/domain/npc';
import { EMPTY_PLAYER_CHARACTER_SHEET } from '@app/features/players/domain/player-character';
import type { RichTextDocument } from '@app/shared/rich-text-editor/rich-text-document';

const DATABASE_URL = 'sqlite:beholders-inn.db';

type SummaryRow = Readonly<{
  id: string;
  universe_id: string;
  name: string;
  summary: string;
  campaign_count: number;
  deleted_at: string | null;
}>;

type DetailBaseRow = Readonly<{
  id: string;
  universe_id: string;
  name: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}>;

type CreatureDetailRow = DetailBaseRow &
  Readonly<{
    image_path: string | null;
    sheet_json: string;
    sheet_schema_version: number;
  }>;

type NpcDetailRow = CreatureDetailRow & Readonly<{ idle_video_path: string | null }>;
type PlayerDetailRow = CreatureDetailRow & Readonly<{ max_hit_points: number | null }>;
type LocationDetailRow = DetailBaseRow &
  Readonly<{ parent_location_id: string | null; summary: string; image_path: string | null }>;
type ItemDetailRow = DetailBaseRow &
  Readonly<{
    item_type_id: string;
    item_rarity_id: string | null;
    attunement: UniverseNarrativeItemDetail['attunement'];
    attunement_condition: string;
    summary: string;
    description_json: string;
    description_schema_version: number;
    image_path: string | null;
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

  override async find(
    universeId: string,
    type: UniverseResourceType,
    id: string,
  ): Promise<UniverseResourceDetail | null> {
    const database = await this.database();
    switch (type) {
      case 'npc': {
        const rows = await database.select<NpcDetailRow[]>(
          `SELECT id, universe_id, name, portrait_path AS image_path, idle_video_path,
                  sheet_json, sheet_schema_version, deleted_at, created_at, updated_at
           FROM npc WHERE universe_id=$1 AND id=$2 AND source_campaign_id IS NULL`,
          [universeId, id],
        );
        return rows[0] ? mapNpc(rows[0]) : null;
      }
      case 'player-character': {
        const rows = await database.select<PlayerDetailRow[]>(
          `SELECT id, universe_id, name, max_hit_points, portrait_path AS image_path,
                  sheet_json, sheet_schema_version, deleted_at, created_at, updated_at
           FROM player_character
           WHERE universe_id=$1 AND id=$2 AND source_campaign_id IS NULL`,
          [universeId, id],
        );
        return rows[0] ? mapPlayerCharacter(rows[0]) : null;
      }
      case 'location': {
        const rows = await database.select<LocationDetailRow[]>(
          `SELECT id, universe_id, parent_location_id, name, summary, image_path,
                  deleted_at, created_at, updated_at
           FROM location WHERE universe_id=$1 AND id=$2 AND source_campaign_id IS NULL`,
          [universeId, id],
        );
        return rows[0] ? mapLocation(rows[0]) : null;
      }
      case 'item': {
        const rows = await database.select<ItemDetailRow[]>(
          `SELECT id, universe_id, item_type_id, item_rarity_id, name, attunement,
                  attunement_condition, summary, description_json,
                  description_schema_version, image_path, deleted_at, created_at, updated_at
           FROM narrative_item
           WHERE universe_id=$1 AND id=$2 AND source_campaign_id IS NULL`,
          [universeId, id],
        );
        return rows[0] ? mapItem(rows[0]) : null;
      }
      case 'monster': {
        const rows = await database.select<CreatureDetailRow[]>(
          `SELECT id, universe_id, name, image_path, sheet_json, sheet_schema_version,
                  deleted_at, created_at, updated_at
           FROM monster WHERE universe_id=$1 AND id=$2 AND source_campaign_id IS NULL`,
          [universeId, id],
        );
        return rows[0] ? mapMonster(rows[0]) : null;
      }
    }
  }

  override async save(resource: UniverseResourceDetail): Promise<void> {
    const database = await this.database();
    let rowsAffected = 0;
    switch (resource.type) {
      case 'npc':
        rowsAffected = (
          await database.execute(
            `INSERT INTO npc(
               id, universe_id, name, portrait_path, idle_video_path, sheet_json,
               sheet_schema_version, created_at, updated_at, source_campaign_id, deleted_at
             ) VALUES ($1,$2,$3,$4,$5,$6,4,$7,$8,NULL,NULL)
             ON CONFLICT(id) DO UPDATE SET name=excluded.name,
               portrait_path=excluded.portrait_path, idle_video_path=excluded.idle_video_path,
               sheet_json=excluded.sheet_json, sheet_schema_version=excluded.sheet_schema_version,
               updated_at=excluded.updated_at
             WHERE npc.universe_id=excluded.universe_id AND npc.source_campaign_id IS NULL`,
            [
              resource.id,
              resource.universeId,
              resource.name,
              resource.portraitPath,
              resource.idleVideoPath,
              JSON.stringify(resource.sheet),
              resource.createdAt,
              resource.updatedAt,
            ],
          )
        ).rowsAffected;
        break;
      case 'player-character':
        rowsAffected = (
          await database.execute(
            `INSERT INTO player_character(
               id, universe_id, name, max_hit_points, portrait_path, sheet_json,
               sheet_schema_version, created_at, updated_at, source_campaign_id, deleted_at
             ) VALUES ($1,$2,$3,$4,$5,$6,2,$7,$8,NULL,NULL)
             ON CONFLICT(id) DO UPDATE SET name=excluded.name,
               max_hit_points=excluded.max_hit_points, portrait_path=excluded.portrait_path,
               sheet_json=excluded.sheet_json, sheet_schema_version=excluded.sheet_schema_version,
               updated_at=excluded.updated_at
             WHERE player_character.universe_id=excluded.universe_id
               AND player_character.source_campaign_id IS NULL`,
            [
              resource.id,
              resource.universeId,
              resource.name,
              resource.maxHitPoints,
              resource.portraitPath,
              JSON.stringify({ ...resource.sheet, privateNotes: '' }),
              resource.createdAt,
              resource.updatedAt,
            ],
          )
        ).rowsAffected;
        break;
      case 'location':
        await this.assertValidLocationParent(resource);
        rowsAffected = (
          await database.execute(
            `INSERT INTO location(
               id, universe_id, parent_location_id, name, summary, image_path,
               created_at, updated_at, source_campaign_id, deleted_at
             ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NULL,NULL)
             ON CONFLICT(id) DO UPDATE SET parent_location_id=excluded.parent_location_id,
               name=excluded.name, summary=excluded.summary, image_path=excluded.image_path,
               updated_at=excluded.updated_at
             WHERE location.universe_id=excluded.universe_id
               AND location.source_campaign_id IS NULL`,
            [
              resource.id,
              resource.universeId,
              resource.parentLocationId,
              resource.name,
              resource.summary,
              resource.imagePath,
              resource.createdAt,
              resource.updatedAt,
            ],
          )
        ).rowsAffected;
        break;
      case 'item':
        await this.assertValidItemConfiguration(resource);
        rowsAffected = (
          await database.execute(
            `INSERT INTO narrative_item(
               id, universe_id, item_type_id, item_rarity_id, name, attunement,
               attunement_condition, summary, description_json,
               description_schema_version, image_path, created_at, updated_at,
               source_campaign_id, deleted_at
             ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NULL,NULL)
             ON CONFLICT(id) DO UPDATE SET item_type_id=excluded.item_type_id,
               item_rarity_id=excluded.item_rarity_id, name=excluded.name,
               attunement=excluded.attunement,
               attunement_condition=excluded.attunement_condition,
               summary=excluded.summary, description_json=excluded.description_json,
               description_schema_version=excluded.description_schema_version,
               image_path=excluded.image_path, updated_at=excluded.updated_at
             WHERE narrative_item.universe_id=excluded.universe_id
               AND narrative_item.source_campaign_id IS NULL`,
            [
              resource.id,
              resource.universeId,
              resource.itemTypeId,
              resource.itemRarityId,
              resource.name,
              resource.attunement,
              resource.attunementCondition,
              resource.summary,
              JSON.stringify(resource.description.content),
              resource.description.schemaVersion,
              resource.imagePath,
              resource.createdAt,
              resource.updatedAt,
            ],
          )
        ).rowsAffected;
        break;
      case 'monster':
        rowsAffected = (
          await database.execute(
            `INSERT INTO monster(
               id, universe_id, name, image_path, sheet_json, sheet_schema_version,
               created_at, updated_at, source_campaign_id, deleted_at
             ) VALUES ($1,$2,$3,$4,$5,1,$6,$7,NULL,NULL)
             ON CONFLICT(id) DO UPDATE SET name=excluded.name,
               image_path=excluded.image_path, sheet_json=excluded.sheet_json,
               sheet_schema_version=excluded.sheet_schema_version,
               updated_at=excluded.updated_at
             WHERE monster.universe_id=excluded.universe_id
               AND monster.source_campaign_id IS NULL`,
            [
              resource.id,
              resource.universeId,
              resource.name,
              resource.imagePath,
              JSON.stringify(resource.sheet),
              resource.createdAt,
              resource.updatedAt,
            ],
          )
        ).rowsAffected;
        break;
    }
    if (rowsAffected === 0) {
      throw new Error("Cette ressource canonique n'existe plus dans l'univers.");
    }
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

  private async assertValidLocationParent(resource: UniverseLocationDetail): Promise<void> {
    if (!resource.parentLocationId) return;
    const rows = await (
      await this.database()
    ).select<Readonly<{ id: string }>[]>(
      `WITH RECURSIVE descendants(id) AS (
         SELECT id FROM location WHERE parent_location_id=$2
         UNION ALL
         SELECT child.id FROM location AS child
         JOIN descendants ON child.parent_location_id=descendants.id
       )
       SELECT parent.id FROM location AS parent
       WHERE parent.id=$3 AND parent.universe_id=$1
         AND parent.source_campaign_id IS NULL AND parent.deleted_at IS NULL
         AND parent.id<>$2 AND parent.id NOT IN (SELECT id FROM descendants)`,
      [resource.universeId, resource.id, resource.parentLocationId],
    );
    if (rows.length === 0) {
      throw new Error("Le lieu parent n'appartient pas à cet univers ou créerait une boucle.");
    }
  }

  private async assertValidItemConfiguration(resource: UniverseNarrativeItemDetail): Promise<void> {
    const rows = await (
      await this.database()
    ).select<Readonly<{ type_count: number; rarity_count: number }>[]>(
      `SELECT
         (SELECT COUNT(*) FROM item_type WHERE id=$2 AND universe_id=$1) AS type_count,
         CASE WHEN $3 IS NULL THEN 1 ELSE
           (SELECT COUNT(*) FROM item_rarity WHERE id=$3 AND universe_id=$1)
         END AS rarity_count`,
      [resource.universeId, resource.itemTypeId, resource.itemRarityId],
    );
    if (rows[0]?.type_count !== 1 || rows[0]?.rarity_count !== 1) {
      throw new Error("Le type ou la rareté n'appartient pas à cet univers.");
    }
  }
}

function base<TType extends UniverseResourceType>(row: DetailBaseRow, type: TType) {
  return {
    id: row.id,
    universeId: row.universe_id,
    type,
    name: row.name,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  } as const;
}

function mapNpc(row: NpcDetailRow): UniverseNpcDetail {
  return {
    ...base(row, 'npc'),
    portraitPath: row.image_path,
    idleVideoPath: row.idle_video_path,
    sheet: normalizeNpcSheet(JSON.parse(row.sheet_json) as unknown),
  };
}

function mapPlayerCharacter(row: PlayerDetailRow): UniversePlayerCharacterDetail {
  const parsed = JSON.parse(row.sheet_json) as Partial<UniversePlayerCharacterDetail['sheet']>;
  return {
    ...base(row, 'player-character'),
    maxHitPoints: row.max_hit_points,
    portraitPath: row.image_path,
    sheet: {
      ...EMPTY_PLAYER_CHARACTER_SHEET,
      ...parsed,
      senses: arrayOfStrings(parsed.senses),
      languages: arrayOfStrings(parsed.languages),
      conditions: arrayOfStrings(parsed.conditions),
      privateNotes: '',
    },
  };
}

function mapLocation(row: LocationDetailRow): UniverseLocationDetail {
  return {
    ...base(row, 'location'),
    parentLocationId: row.parent_location_id,
    summary: row.summary,
    imagePath: row.image_path,
  };
}

function mapItem(row: ItemDetailRow): UniverseNarrativeItemDetail {
  if (row.description_schema_version !== 1) {
    throw new Error("Version de description d'objet non prise en charge.");
  }
  return {
    ...base(row, 'item'),
    itemTypeId: row.item_type_id,
    itemRarityId: row.item_rarity_id,
    attunement: row.attunement,
    attunementCondition: row.attunement_condition,
    summary: row.summary,
    description: {
      schemaVersion: 1,
      content: JSON.parse(row.description_json) as RichTextDocument['content'],
    },
    imagePath: row.image_path,
  };
}

function mapMonster(row: CreatureDetailRow): UniverseMonsterDetail {
  return {
    ...base(row, 'monster'),
    imagePath: row.image_path,
    sheet: normalizeNpcSheet(JSON.parse(row.sheet_json) as unknown),
  };
}

function arrayOfStrings(value: unknown): readonly string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
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
