import { Injectable } from '@angular/core';
import Database from '@tauri-apps/plugin-sql';

import {
  EMPTY_PLAYER_CHARACTER_SHEET,
  type PlayerCharacter,
  type PlayerCharacterSheet,
  type PlayerCharacterStatus,
} from '../player-character/player-character';
import { PlayerCharacterRepository } from '../player-character/player-character.repository';

const DATABASE_URL = 'sqlite:beholders-inn.db';

type PlayerCharacterRow = Readonly<{
  id: string;
  campaign_id: string;
  name: string;
  player_name: string;
  status: PlayerCharacterStatus;
  current_hit_points: number | null;
  max_hit_points: number | null;
  sheet_json: string;
  sheet_schema_version: number;
  created_at: string;
  updated_at: string;
}>;

@Injectable()
export class TauriPlayerCharacterRepository extends PlayerCharacterRepository {
  private databasePromise?: Promise<Database>;

  override async listByCampaign(campaignId: string): Promise<readonly PlayerCharacter[]> {
    const database = await this.getDatabase();
    const rows = await database.select<PlayerCharacterRow[]>(
      `${PLAYER_CHARACTER_COLUMNS}
       FROM player_character
       WHERE campaign_id = $1
       ORDER BY name COLLATE NOCASE, id`,
      [campaignId],
    );
    return rows.map(mapPlayerCharacterRow);
  }

  override async findById(campaignId: string, id: string): Promise<PlayerCharacter | null> {
    const database = await this.getDatabase();
    const rows = await database.select<PlayerCharacterRow[]>(
      `${PLAYER_CHARACTER_COLUMNS}
       FROM player_character
       WHERE campaign_id = $1 AND id = $2`,
      [campaignId, id],
    );
    return rows[0] ? mapPlayerCharacterRow(rows[0]) : null;
  }

  override async save(character: PlayerCharacter): Promise<void> {
    const database = await this.getDatabase();
    await database.execute(
      `INSERT INTO player_character (
         id, campaign_id, name, player_name, status, current_hit_points, max_hit_points,
         sheet_json, sheet_schema_version, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         player_name = excluded.player_name,
         status = excluded.status,
         current_hit_points = excluded.current_hit_points,
         max_hit_points = excluded.max_hit_points,
         sheet_json = excluded.sheet_json,
         sheet_schema_version = excluded.sheet_schema_version,
         updated_at = excluded.updated_at
       WHERE player_character.campaign_id = excluded.campaign_id`,
      [
        character.id,
        character.campaignId,
        character.name,
        character.playerName,
        character.status,
        character.currentHitPoints,
        character.maxHitPoints,
        JSON.stringify(character.sheet),
        character.sheetSchemaVersion,
        character.createdAt,
        character.updatedAt,
      ],
    );
  }

  override async delete(campaignId: string, id: string): Promise<void> {
    const database = await this.getDatabase();
    await database.execute('DELETE FROM player_character WHERE campaign_id = $1 AND id = $2', [
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

const PLAYER_CHARACTER_COLUMNS = `SELECT id, campaign_id, name, player_name, status,
                                          current_hit_points, max_hit_points, sheet_json,
                                          sheet_schema_version, created_at, updated_at`;

function mapPlayerCharacterRow(row: PlayerCharacterRow): PlayerCharacter {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    name: row.name,
    playerName: row.player_name,
    status: row.status,
    currentHitPoints: row.current_hit_points,
    maxHitPoints: row.max_hit_points,
    sheet: parseSheet(row.sheet_json),
    sheetSchemaVersion: row.sheet_schema_version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parseSheet(value: string): PlayerCharacterSheet {
  const parsed: unknown = JSON.parse(value);
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('Invalid player character sheet data.');
  }
  const sheet = parsed as Record<string, unknown>;
  return {
    ...EMPTY_PLAYER_CHARACTER_SHEET,
    ...sheet,
    senses: parseTags(sheet['senses']),
    languages: parseTags(sheet['languages']),
    conditions: parseTags(sheet['conditions']),
  } as PlayerCharacterSheet;
}

function parseTags(value: unknown): readonly string[] {
  if (Array.isArray(value)) return value.filter((tag): tag is string => typeof tag === 'string');
  if (typeof value === 'string') {
    const normalized = value.trim();
    return normalized ? [normalized] : [];
  }
  return [];
}
