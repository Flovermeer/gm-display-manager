/**
 * But
 * Persiste les objets narratifs dans SQLite.
 *
 * Responsabilités
 * - sérialise leur description riche ;
 * - convertit propriétaires et statuts vers le domaine ;
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
}>;

@Injectable()
export class TauriNarrativeItemRepository extends NarrativeItemRepository {
  private databasePromise?: Promise<Database>;

  override async listByCampaign(campaignId: string) {
    return this.select(
      `${ITEM_COLUMNS} WHERE campaign_narrative_item.campaign_id = $1
       ORDER BY narrative_item.name COLLATE NOCASE, narrative_item.id`,
      [campaignId],
    );
  }

  override async findById(campaignId: string, id: string) {
    const items = await this.select(
      `${ITEM_COLUMNS} WHERE campaign_narrative_item.campaign_id = $1
       AND narrative_item.id = $2`,
      [campaignId, id],
    );
    return items[0] ?? null;
  }

  override async save(item: NarrativeItem): Promise<void> {
    const ownerIds = {
      npc: item.owner?.resourceType === 'npc' ? item.owner.resourceId : null,
      location: item.owner?.resourceType === 'location' ? item.owner.resourceId : null,
      character: item.owner?.resourceType === 'player-character' ? item.owner.resourceId : null,
    };
    await (
      await this.database()
    ).execute(
      `INSERT INTO narrative_item (
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
    await (
      await this.database()
    ).execute('DELETE FROM campaign_narrative_item WHERE campaign_id = $1 AND item_id = $2', [
      campaignId,
      id,
    ]);
  }

  override async countUsingConfiguration(campaignId: string, kind: 'type' | 'rarity', id: string) {
    const column = kind === 'type' ? 'item_type_id' : 'item_rarity_id';
    const rows = await (
      await this.database()
    ).select<{ count: number }[]>(
      `SELECT COUNT(*) AS count FROM narrative_item
       JOIN campaign_narrative_item ON campaign_narrative_item.item_id=narrative_item.id
       WHERE campaign_narrative_item.campaign_id = $1 AND narrative_item.${column} = $2`,
      [campaignId, id],
    );
    return rows[0]?.count ?? 0;
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
  MAX(narrative_item.updated_at, campaign_narrative_item.updated_at) AS updated_at
  FROM campaign_narrative_item
  JOIN narrative_item ON narrative_item.id=campaign_narrative_item.item_id`;

function mapRow(row: ItemRow): NarrativeItem {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    itemTypeId: row.item_type_id,
    itemRarityId: row.item_rarity_id,
    owner: row.owner_npc_id
      ? { resourceType: 'npc', resourceId: row.owner_npc_id }
      : row.owner_location_id
        ? { resourceType: 'location', resourceId: row.owner_location_id }
        : row.owner_player_character_id
          ? { resourceType: 'player-character', resourceId: row.owner_player_character_id }
          : null,
    name: row.name,
    status: row.status,
    attunement: row.attunement,
    attunementCondition: row.attunement_condition,
    summary: row.summary,
    description: parseDescription(row.description_json, row.description_schema_version),
    imagePath: row.image_path,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parseDescription(value: string, schemaVersion: number): RichTextDocument {
  const content: unknown = JSON.parse(value);
  if (!content || typeof content !== 'object' || Array.isArray(content) || schemaVersion !== 1)
    throw new Error('Invalid narrative item description data.');
  return { schemaVersion, content } as RichTextDocument;
}
