/**
 * But
 * Persiste les objets narratifs partagés et leur état de campagne dans SQLite.
 *
 * Responsabilités
 * - sépare la fiche canonique du statut et du détenteur courant ;
 * - gère les snapshots de campagne, imports, promotions et réinitialisations ;
 * - sérialise et valide la description riche.
 */

import { Injectable } from '@angular/core';
import Database from '@tauri-apps/plugin-sql';

import type { NarrativeItem } from '@app/features/items/domain/narrative-item';
import { NarrativeItemRepository } from '@app/features/items/data-access/narrative-item.repository';
import type { RichTextDocument } from '@app/shared/rich-text-editor/rich-text-document';

const DATABASE_URL = 'sqlite:beholders-inn.db';
type ItemRow = Readonly<{
  id: string;
  campaign_id: string;
  item_type_id: string;
  item_rarity_id: string | null;
  owner_npc_id: string | null;
  owner_location_id: string | null;
  owner_player_character_id: string | null;
  name: string;
  status: NarrativeItem['status'];
  attunement: NarrativeItem['attunement'];
  attunement_condition: string;
  summary: string;
  description_json: string;
  description_schema_version: number;
  image_path: string | null;
  created_at: string;
  updated_at: string;
  source_campaign_id: string | null;
  override_snapshot: string | null;
}>;

@Injectable()
export class TauriNarrativeItemRepository extends NarrativeItemRepository {
  private databasePromise?: Promise<Database>;

  override listByCampaign(campaignId: string): Promise<readonly NarrativeItem[]> {
    return this.select(
      `${ITEM_COLUMNS}
       WHERE campaign_narrative_item.campaign_id=$1
         AND NOT (
           narrative_item.source_campaign_id=$1
           AND narrative_item.deleted_at IS NOT NULL
         )
       ORDER BY narrative_item.name COLLATE NOCASE, narrative_item.id`,
      [campaignId],
    );
  }

  override listAvailableByCampaign(campaignId: string): Promise<readonly NarrativeItem[]> {
    return this.select(
      `SELECT narrative_item.id, campaign.id AS campaign_id,
              narrative_item.item_type_id, narrative_item.item_rarity_id,
              NULL AS owner_npc_id, NULL AS owner_location_id,
              NULL AS owner_player_character_id, narrative_item.name,
              'active' AS status, narrative_item.attunement,
              narrative_item.attunement_condition, narrative_item.summary,
              narrative_item.description_json, narrative_item.description_schema_version,
              narrative_item.image_path, narrative_item.created_at,
              narrative_item.updated_at, narrative_item.source_campaign_id,
              NULL AS override_snapshot
       FROM campaign
       JOIN narrative_item ON narrative_item.universe_id IN (
         campaign.universe_id,
         (SELECT game_system_id || ':generic' FROM game_universe WHERE id=campaign.universe_id)
       )
       WHERE campaign.id=$1 AND narrative_item.source_campaign_id IS NULL
         AND narrative_item.deleted_at IS NULL
         AND NOT EXISTS (
           SELECT 1 FROM campaign_narrative_item
           WHERE campaign_narrative_item.campaign_id=campaign.id
             AND campaign_narrative_item.item_id=narrative_item.id
         )
       ORDER BY narrative_item.name COLLATE NOCASE, narrative_item.id`,
      [campaignId],
    );
  }

  override async findById(campaignId: string, id: string): Promise<NarrativeItem | null> {
    const items = await this.select(
      `${ITEM_COLUMNS}
       WHERE campaign_narrative_item.campaign_id=$1 AND narrative_item.id=$2`,
      [campaignId, id],
    );
    return items[0] ?? null;
  }

  override async save(item: NarrativeItem): Promise<void> {
    const database = await this.database();
    if (item.provenance !== 'campaign') {
      await database.execute(
        `INSERT INTO campaign_resource_override(
           campaign_id, resource_type, resource_id, snapshot_json, created_at, updated_at
         ) VALUES ($1,'item',$2,$3,$4,$4)
         ON CONFLICT(campaign_id, resource_type, resource_id) DO UPDATE SET
           snapshot_json=excluded.snapshot_json, updated_at=excluded.updated_at`,
        [item.campaignId, item.id, JSON.stringify(snapshot(item)), item.updatedAt],
      );
    } else {
      await database.execute(
        `INSERT INTO narrative_item(
           id, universe_id, item_type_id, item_rarity_id, name, attunement,
           attunement_condition, summary, description_json, description_schema_version,
           image_path, created_at, updated_at, source_campaign_id
         ) VALUES ($1,(SELECT universe_id FROM campaign WHERE id=$2),$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$2)
         ON CONFLICT(id) DO UPDATE SET
           item_type_id=excluded.item_type_id, item_rarity_id=excluded.item_rarity_id,
           name=excluded.name, attunement=excluded.attunement,
           attunement_condition=excluded.attunement_condition, summary=excluded.summary,
           description_json=excluded.description_json,
           description_schema_version=excluded.description_schema_version,
           image_path=excluded.image_path, updated_at=excluded.updated_at
         WHERE narrative_item.universe_id=excluded.universe_id
           AND narrative_item.source_campaign_id=excluded.source_campaign_id`,
        [
          item.id,
          item.campaignId,
          item.itemTypeId,
          item.itemRarityId,
          item.name,
          item.attunement,
          item.attunementCondition,
          item.summary,
          JSON.stringify(item.description.content),
          item.description.schemaVersion,
          item.imagePath,
          item.createdAt,
          item.updatedAt,
        ],
      );
    }
    await this.saveCampaignState(item);
  }

  override async saveCampaignState(item: NarrativeItem): Promise<void> {
    const ownerIds = ownerColumns(item);
    await (
      await this.database()
    ).execute(
      `INSERT INTO campaign_narrative_item(
         campaign_id, item_id, status, owner_npc_id, owner_location_id,
         owner_player_character_id, created_at, updated_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT(campaign_id, item_id) DO UPDATE SET
         status=excluded.status, owner_npc_id=excluded.owner_npc_id,
         owner_location_id=excluded.owner_location_id,
         owner_player_character_id=excluded.owner_player_character_id,
         updated_at=excluded.updated_at`,
      [
        item.campaignId,
        item.id,
        item.status,
        ownerIds.npc,
        ownerIds.location,
        ownerIds.character,
        item.createdAt,
        item.updatedAt,
      ],
    );
  }

  override async delete(campaignId: string, id: string): Promise<void> {
    const database = await this.database();
    const local = await database.execute(
      `UPDATE narrative_item
       SET deleted_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP
       WHERE id=$2 AND source_campaign_id=$1`,
      [campaignId, id],
    );
    if (local.rowsAffected > 0) return;
    await database.execute(
      `DELETE FROM campaign_resource_override
       WHERE campaign_id=$1 AND resource_type='item' AND resource_id=$2`,
      [campaignId, id],
    );
    await database.execute(
      'DELETE FROM campaign_narrative_item WHERE campaign_id=$1 AND item_id=$2',
      [campaignId, id],
    );
  }

  override async attach(campaignId: string, id: string): Promise<void> {
    const result = await (
      await this.database()
    ).execute(
      `INSERT INTO campaign_narrative_item(
         campaign_id, item_id, status, owner_npc_id, owner_location_id,
         owner_player_character_id, created_at, updated_at
       )
       SELECT campaign.id, narrative_item.id, 'active', NULL, NULL, NULL,
              CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
       FROM campaign JOIN narrative_item ON narrative_item.id=$2
       WHERE campaign.id=$1 AND narrative_item.universe_id IN (
         campaign.universe_id,
         (SELECT game_system_id || ':generic' FROM game_universe WHERE id=campaign.universe_id)
       )
         AND narrative_item.source_campaign_id IS NULL
         AND narrative_item.deleted_at IS NULL
       ON CONFLICT(campaign_id, item_id) DO NOTHING`,
      [campaignId, id],
    );
    if (result.rowsAffected === 0 && !(await this.findById(campaignId, id))) {
      throw new Error("Cet objet n'appartient pas à l'univers de la campagne.");
    }
  }

  override async promote(campaignId: string, id: string): Promise<void> {
    const result = await (
      await this.database()
    ).execute(
      `UPDATE narrative_item
       SET source_campaign_id=NULL, deleted_at=NULL, updated_at=CURRENT_TIMESTAMP
       WHERE id=$2 AND source_campaign_id=$1`,
      [campaignId, id],
    );
    if (result.rowsAffected === 0) {
      throw new Error("Seul un objet local peut être enregistré dans l'univers.");
    }
  }

  override async resetOverride(campaignId: string, id: string): Promise<void> {
    await (
      await this.database()
    ).execute(
      `DELETE FROM campaign_resource_override
       WHERE campaign_id=$1 AND resource_type='item' AND resource_id=$2`,
      [campaignId, id],
    );
  }

  override async countUsingConfiguration(
    universeId: string,
    kind: 'type' | 'rarity',
    id: string,
  ): Promise<number> {
    const column = kind === 'type' ? 'item_type_id' : 'item_rarity_id';
    const rows = await (
      await this.database()
    ).select<Readonly<{ usage_count: number }>[]>(
      `SELECT COUNT(*) AS usage_count FROM narrative_item
       WHERE universe_id=$1 AND ${column}=$2`,
      [universeId, id],
    );
    return rows[0]?.usage_count ?? 0;
  }

  private async select(query: string, values: readonly unknown[]) {
    const rows = await (await this.database()).select<ItemRow[]>(query, [...values]);
    return rows.map(mapRow);
  }

  private database(): Promise<Database> {
    this.databasePromise ??= Database.load(DATABASE_URL).catch((error: unknown) => {
      this.databasePromise = undefined;
      throw error;
    });
    return this.databasePromise;
  }
}

const ITEM_COLUMNS = `SELECT narrative_item.id, campaign_narrative_item.campaign_id,
  narrative_item.item_type_id, narrative_item.item_rarity_id,
  campaign_narrative_item.owner_npc_id, campaign_narrative_item.owner_location_id,
  campaign_narrative_item.owner_player_character_id, narrative_item.name,
  campaign_narrative_item.status, narrative_item.attunement,
  narrative_item.attunement_condition, narrative_item.summary,
  narrative_item.description_json, narrative_item.description_schema_version,
  narrative_item.image_path, narrative_item.created_at,
  MAX(narrative_item.updated_at, campaign_narrative_item.updated_at) AS updated_at,
  narrative_item.source_campaign_id,
  resource_override.snapshot_json AS override_snapshot
  FROM campaign_narrative_item
  JOIN narrative_item ON narrative_item.id=campaign_narrative_item.item_id
  LEFT JOIN campaign_resource_override AS resource_override
    ON resource_override.campaign_id=campaign_narrative_item.campaign_id
   AND resource_override.resource_type='item'
   AND resource_override.resource_id=narrative_item.id`;

function mapRow(row: ItemRow): NarrativeItem {
  const override = row.override_snapshot
    ? (JSON.parse(row.override_snapshot) as ReturnType<typeof snapshot>)
    : null;
  return {
    id: row.id,
    campaignId: row.campaign_id,
    provenance: row.source_campaign_id ? 'campaign' : override ? 'override' : 'universe',
    itemTypeId: override?.itemTypeId ?? row.item_type_id,
    itemRarityId: override?.itemRarityId ?? row.item_rarity_id,
    owner: row.owner_npc_id
      ? { resourceType: 'npc', resourceId: row.owner_npc_id }
      : row.owner_location_id
        ? { resourceType: 'location', resourceId: row.owner_location_id }
        : row.owner_player_character_id
          ? { resourceType: 'player-character', resourceId: row.owner_player_character_id }
          : null,
    name: override?.name ?? row.name,
    status: row.status,
    attunement: override?.attunement ?? row.attunement,
    attunementCondition: override?.attunementCondition ?? row.attunement_condition,
    summary: override?.summary ?? row.summary,
    description:
      override?.description ??
      parseDescription(row.description_json, row.description_schema_version),
    imagePath: override?.imagePath ?? row.image_path,
    createdAt: row.created_at,
    updatedAt: override?.updatedAt ?? row.updated_at,
  };
}

function ownerColumns(item: NarrativeItem) {
  return {
    npc: item.owner?.resourceType === 'npc' ? item.owner.resourceId : null,
    location: item.owner?.resourceType === 'location' ? item.owner.resourceId : null,
    character: item.owner?.resourceType === 'player-character' ? item.owner.resourceId : null,
  };
}

function snapshot(item: NarrativeItem) {
  return {
    itemTypeId: item.itemTypeId,
    itemRarityId: item.itemRarityId,
    name: item.name,
    attunement: item.attunement,
    attunementCondition: item.attunementCondition,
    summary: item.summary,
    description: item.description,
    imagePath: item.imagePath,
    updatedAt: item.updatedAt,
  };
}

function parseDescription(value: string, schemaVersion: number): RichTextDocument {
  const content: unknown = JSON.parse(value);
  if (!content || typeof content !== 'object' || Array.isArray(content) || schemaVersion !== 1) {
    throw new Error('Invalid narrative item description data.');
  }
  return { schemaVersion, content } as RichTextDocument;
}
