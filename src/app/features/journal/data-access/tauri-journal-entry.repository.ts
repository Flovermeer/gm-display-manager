/**
 * But
 * Persiste les entrées de journal dans SQLite.
 *
 * Responsabilités
 * - sérialise les documents riches ;
 * - reconstruit les cibles et horodatages du domaine ;
 */

import { Injectable } from '@angular/core';
import Database from '@tauri-apps/plugin-sql';

import type { JournalEntry, JournalTarget } from '@app/features/journal/domain/journal-entry';
import { JournalEntryRepository } from '@app/features/journal/data-access/journal-entry.repository';
import type { RichTextDocument } from '@app/shared/rich-text-editor/rich-text-document';

const DATABASE_URL = 'sqlite:beholders-inn.db';

type JournalEntryRow = Readonly<{
  id: string;
  campaign_id: string;
  npc_id: string | null;
  location_id: string | null;
  player_character_id: string | null;
  item_id: string | null;
  scene_id: string | null;
  session_at: string;
  in_game_date: string;
  title: string;
  content_json: string;
  content_schema_version: number;
  created_at: string;
  updated_at: string;
}>;

@Injectable()
export class TauriJournalEntryRepository extends JournalEntryRepository {
  private databasePromise?: Promise<Database>;

  override async listByCampaign(campaignId: string): Promise<readonly JournalEntry[]> {
    return this.select(`${JOURNAL_COLUMNS} FROM journal_entry WHERE campaign_id = $1 ${ORDER}`, [
      campaignId,
    ]);
  }

  override async listGlobalByCampaign(campaignId: string): Promise<readonly JournalEntry[]> {
    return this.select(
      `${JOURNAL_COLUMNS} FROM journal_entry
         WHERE campaign_id = $1 AND npc_id IS NULL AND location_id IS NULL
         AND player_character_id IS NULL AND item_id IS NULL AND scene_id IS NULL ${ORDER}`,
      [campaignId],
    );
  }

  override async listByTarget(
    campaignId: string,
    target: JournalTarget,
  ): Promise<readonly JournalEntry[]> {
    const column = targetColumn(target.resourceType);
    return this.select(
      `${JOURNAL_COLUMNS} FROM journal_entry WHERE campaign_id = $1 AND ${column} = $2 ${ORDER}`,
      [campaignId, target.resourceId],
    );
  }

  override async findById(campaignId: string, id: string): Promise<JournalEntry | null> {
    const entries = await this.select(
      `${JOURNAL_COLUMNS} FROM journal_entry WHERE campaign_id = $1 AND id = $2`,
      [campaignId, id],
    );
    return entries[0] ?? null;
  }

  override async save(entry: JournalEntry): Promise<void> {
    const database = await this.getDatabase();
    const targetIds = {
      npc: entry.target?.resourceType === 'npc' ? entry.target.resourceId : null,
      location: entry.target?.resourceType === 'location' ? entry.target.resourceId : null,
      playerCharacter:
        entry.target?.resourceType === 'player-character' ? entry.target.resourceId : null,
      item: entry.target?.resourceType === 'item' ? entry.target.resourceId : null,
      scene: entry.target?.resourceType === 'scene' ? entry.target.resourceId : null,
    };
    await database.execute(
      `INSERT INTO journal_entry (
         id, campaign_id, npc_id, location_id, player_character_id, item_id, scene_id, session_at,
         in_game_date, title, content_json, content_schema_version, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       ON CONFLICT(id) DO UPDATE SET
         session_at = excluded.session_at,
         in_game_date = excluded.in_game_date,
         title = excluded.title,
         content_json = excluded.content_json,
         content_schema_version = excluded.content_schema_version,
         updated_at = excluded.updated_at
       WHERE journal_entry.campaign_id = excluded.campaign_id`,
      [
        entry.id,
        entry.campaignId,
        targetIds.npc,
        targetIds.location,
        targetIds.playerCharacter,
        targetIds.item,
        targetIds.scene,
        entry.sessionAt,
        entry.inGameDate,
        entry.title,
        JSON.stringify(entry.content.content),
        entry.content.schemaVersion,
        entry.createdAt,
        entry.updatedAt,
      ],
    );
  }

  override async delete(campaignId: string, id: string): Promise<void> {
    const database = await this.getDatabase();
    await database.execute('DELETE FROM journal_entry WHERE campaign_id = $1 AND id = $2', [
      campaignId,
      id,
    ]);
  }

  private async select(
    query: string,
    bindValues: readonly unknown[],
  ): Promise<readonly JournalEntry[]> {
    const database = await this.getDatabase();
    const rows = await database.select<JournalEntryRow[]>(query, [...bindValues]);
    return rows.map(mapRow);
  }

  private getDatabase(): Promise<Database> {
    this.databasePromise ??= Database.load(DATABASE_URL).catch((error: unknown) => {
      this.databasePromise = undefined;
      throw error;
    });
    return this.databasePromise;
  }
}

const JOURNAL_COLUMNS = `SELECT id, campaign_id, npc_id, location_id, player_character_id,
  item_id, scene_id, session_at, in_game_date, title, content_json, content_schema_version, created_at, updated_at`;
const ORDER = 'ORDER BY session_at DESC, created_at DESC, id DESC';

function targetColumn(resourceType: JournalTarget['resourceType']): string {
  return {
    npc: 'npc_id',
    location: 'location_id',
    'player-character': 'player_character_id',
    item: 'item_id',
    scene: 'scene_id',
  }[resourceType];
}

function mapRow(row: JournalEntryRow): JournalEntry {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    target: row.npc_id
      ? { resourceType: 'npc', resourceId: row.npc_id }
      : row.location_id
        ? { resourceType: 'location', resourceId: row.location_id }
        : row.player_character_id
          ? { resourceType: 'player-character', resourceId: row.player_character_id }
          : row.item_id
            ? { resourceType: 'item', resourceId: row.item_id }
            : row.scene_id
              ? { resourceType: 'scene', resourceId: row.scene_id }
              : null,
    sessionAt: row.session_at,
    inGameDate: row.in_game_date,
    title: row.title,
    content: parseContent(row.content_json, row.content_schema_version),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parseContent(value: string, schemaVersion: number): RichTextDocument {
  const content: unknown = JSON.parse(value);
  if (!content || typeof content !== 'object' || Array.isArray(content) || schemaVersion !== 1) {
    throw new Error('Invalid journal content data.');
  }
  return { schemaVersion, content } as RichTextDocument;
}
