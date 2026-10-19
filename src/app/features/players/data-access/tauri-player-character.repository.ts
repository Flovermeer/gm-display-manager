/**
 * But
 * Persiste les fiches PJ partagées et leur état de campagne dans SQLite.
 *
 * Responsabilités
 * - sépare la fiche canonique du joueur, du statut et des PV courants ;
 * - projette les personnalisations de campagne depuis un snapshot complet ;
 * - gère l'import, la promotion et la réinitialisation des fiches.
 */

import { Injectable } from '@angular/core';
import Database from '@tauri-apps/plugin-sql';

import {
  EMPTY_PLAYER_CHARACTER_SHEET,
  type PlayerCharacter,
  type PlayerCharacterSheet,
  type PlayerCharacterStatus,
} from '@app/features/players/domain/player-character';
import { PlayerCharacterRepository } from '@app/features/players/data-access/player-character.repository';

const DATABASE_URL = 'sqlite:beholders-inn.db';

type PlayerCharacterRow = Readonly<{
  id: string;
  campaign_id: string;
  name: string;
  player_name: string;
  status: PlayerCharacterStatus;
  current_hit_points: number | null;
  max_hit_points: number | null;
  portrait_path: string | null;
  sheet_json: string;
  sheet_schema_version: number;
  created_at: string;
  updated_at: string;
  source_campaign_id: string | null;
  override_snapshot: string | null;
}>;

@Injectable()
export class TauriPlayerCharacterRepository extends PlayerCharacterRepository {
  private databasePromise?: Promise<Database>;

  override listByCampaign(campaignId: string): Promise<readonly PlayerCharacter[]> {
    return this.select(
      `${PLAYER_CHARACTER_COLUMNS}
       FROM campaign_player_character
       JOIN player_character
         ON player_character.id=campaign_player_character.player_character_id
       LEFT JOIN campaign_resource_override AS resource_override
         ON resource_override.campaign_id=campaign_player_character.campaign_id
        AND resource_override.resource_type='player-character'
        AND resource_override.resource_id=player_character.id
       WHERE campaign_player_character.campaign_id=$1
         AND NOT (
           player_character.source_campaign_id=$1
           AND player_character.deleted_at IS NOT NULL
         )
       ORDER BY player_character.name COLLATE NOCASE, player_character.id`,
      [campaignId],
    );
  }

  override listAvailableByCampaign(campaignId: string): Promise<readonly PlayerCharacter[]> {
    return this.select(
      `SELECT player_character.id, campaign.id AS campaign_id, player_character.name,
              '' AS player_name, 'active' AS status,
              player_character.max_hit_points AS current_hit_points,
              player_character.max_hit_points, player_character.portrait_path,
              player_character.sheet_json, player_character.sheet_schema_version,
              player_character.created_at, player_character.updated_at,
              player_character.source_campaign_id, NULL AS override_snapshot
       FROM campaign
       JOIN player_character ON player_character.universe_id IN (
         campaign.universe_id,
         (SELECT game_system_id || ':generic' FROM game_universe WHERE id=campaign.universe_id)
       )
       WHERE campaign.id=$1 AND player_character.source_campaign_id IS NULL
         AND player_character.deleted_at IS NULL
         AND NOT EXISTS (
           SELECT 1 FROM campaign_player_character
           WHERE campaign_player_character.campaign_id=campaign.id
             AND campaign_player_character.player_character_id=player_character.id
         )
       ORDER BY player_character.name COLLATE NOCASE, player_character.id`,
      [campaignId],
    );
  }

  override async findById(campaignId: string, id: string): Promise<PlayerCharacter | null> {
    const characters = await this.select(
      `${PLAYER_CHARACTER_COLUMNS}
       FROM campaign_player_character
       JOIN player_character
         ON player_character.id=campaign_player_character.player_character_id
       LEFT JOIN campaign_resource_override AS resource_override
         ON resource_override.campaign_id=campaign_player_character.campaign_id
        AND resource_override.resource_type='player-character'
        AND resource_override.resource_id=player_character.id
       WHERE campaign_player_character.campaign_id=$1 AND player_character.id=$2`,
      [campaignId, id],
    );
    return characters[0] ?? null;
  }

  override async save(character: PlayerCharacter): Promise<void> {
    const database = await this.database();
    if (character.provenance !== 'campaign') {
      await database.execute(
        `INSERT INTO campaign_resource_override(
           campaign_id, resource_type, resource_id, snapshot_json, created_at, updated_at
         ) VALUES ($1,'player-character',$2,$3,$4,$4)
         ON CONFLICT(campaign_id, resource_type, resource_id) DO UPDATE SET
           snapshot_json=excluded.snapshot_json, updated_at=excluded.updated_at`,
        [
          character.campaignId,
          character.id,
          JSON.stringify(snapshot(character)),
          character.updatedAt,
        ],
      );
    } else {
      await database.execute(
        `INSERT INTO player_character(
           id, universe_id, name, max_hit_points, portrait_path, sheet_json,
           sheet_schema_version, created_at, updated_at, source_campaign_id
         ) VALUES ($1,(SELECT universe_id FROM campaign WHERE id=$2),$3,$4,$5,$6,$7,$8,$9,$2)
         ON CONFLICT(id) DO UPDATE SET
           name=excluded.name, max_hit_points=excluded.max_hit_points,
           portrait_path=excluded.portrait_path, sheet_json=excluded.sheet_json,
           sheet_schema_version=excluded.sheet_schema_version,
           updated_at=excluded.updated_at
         WHERE player_character.universe_id=excluded.universe_id
           AND player_character.source_campaign_id=excluded.source_campaign_id`,
        [
          character.id,
          character.campaignId,
          character.name,
          character.maxHitPoints,
          character.portraitPath,
          JSON.stringify(canonicalSheet(character.sheet)),
          character.sheetSchemaVersion,
          character.createdAt,
          character.updatedAt,
        ],
      );
    }
    await this.saveCampaignState(character);
  }

  override async saveCampaignState(character: PlayerCharacter): Promise<void> {
    await (
      await this.database()
    ).execute(
      `INSERT INTO campaign_player_character(
         campaign_id, player_character_id, player_name, status, current_hit_points,
         created_at, updated_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT(campaign_id, player_character_id) DO UPDATE SET
         player_name=excluded.player_name, status=excluded.status,
         current_hit_points=excluded.current_hit_points, updated_at=excluded.updated_at`,
      [
        character.campaignId,
        character.id,
        character.playerName,
        character.status,
        character.currentHitPoints,
        character.createdAt,
        character.updatedAt,
      ],
    );
  }

  override async delete(campaignId: string, id: string): Promise<void> {
    const database = await this.database();
    const local = await database.execute(
      `UPDATE player_character
       SET deleted_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP
       WHERE id=$2 AND source_campaign_id=$1`,
      [campaignId, id],
    );
    if (local.rowsAffected > 0) return;

    await database.execute(
      `DELETE FROM campaign_resource_override
       WHERE campaign_id=$1 AND resource_type='player-character' AND resource_id=$2`,
      [campaignId, id],
    );
    await database.execute(
      `DELETE FROM campaign_player_character
       WHERE campaign_id=$1 AND player_character_id=$2`,
      [campaignId, id],
    );
  }

  override async attach(campaignId: string, id: string): Promise<void> {
    const result = await (
      await this.database()
    ).execute(
      `INSERT INTO campaign_player_character(
         campaign_id, player_character_id, player_name, status, current_hit_points,
         created_at, updated_at
       )
       SELECT campaign.id, player_character.id, '', 'active',
              player_character.max_hit_points, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
       FROM campaign JOIN player_character ON player_character.id=$2
       WHERE campaign.id=$1 AND player_character.universe_id IN (
         campaign.universe_id,
         (SELECT game_system_id || ':generic' FROM game_universe WHERE id=campaign.universe_id)
       )
         AND player_character.source_campaign_id IS NULL
         AND player_character.deleted_at IS NULL
       ON CONFLICT(campaign_id, player_character_id) DO NOTHING`,
      [campaignId, id],
    );
    if (result.rowsAffected === 0 && !(await this.findById(campaignId, id))) {
      throw new Error("Ce PJ n'appartient pas à l'univers de la campagne.");
    }
  }

  override async promote(campaignId: string, id: string): Promise<void> {
    const result = await (
      await this.database()
    ).execute(
      `UPDATE player_character
       SET source_campaign_id=NULL, deleted_at=NULL, updated_at=CURRENT_TIMESTAMP
       WHERE id=$2 AND source_campaign_id=$1`,
      [campaignId, id],
    );
    if (result.rowsAffected === 0) {
      throw new Error("Seul un PJ local peut être enregistré dans l'univers.");
    }
  }

  override async resetOverride(campaignId: string, id: string): Promise<void> {
    await (
      await this.database()
    ).execute(
      `DELETE FROM campaign_resource_override
       WHERE campaign_id=$1 AND resource_type='player-character' AND resource_id=$2`,
      [campaignId, id],
    );
  }

  private async select(
    query: string,
    values: readonly unknown[],
  ): Promise<readonly PlayerCharacter[]> {
    const rows = await (await this.database()).select<PlayerCharacterRow[]>(query, [...values]);
    return rows.map(mapPlayerCharacterRow);
  }

  private database(): Promise<Database> {
    this.databasePromise ??= Database.load(DATABASE_URL).catch((error: unknown) => {
      this.databasePromise = undefined;
      throw error;
    });
    return this.databasePromise;
  }
}

const PLAYER_CHARACTER_COLUMNS = `SELECT player_character.id,
  campaign_player_character.campaign_id, player_character.name,
  campaign_player_character.player_name, campaign_player_character.status,
  campaign_player_character.current_hit_points, player_character.max_hit_points,
  player_character.portrait_path, player_character.sheet_json,
  player_character.sheet_schema_version, player_character.created_at,
  MAX(player_character.updated_at, campaign_player_character.updated_at) AS updated_at,
  player_character.source_campaign_id,
  resource_override.snapshot_json AS override_snapshot`;

function mapPlayerCharacterRow(row: PlayerCharacterRow): PlayerCharacter {
  const override = row.override_snapshot
    ? (JSON.parse(row.override_snapshot) as ReturnType<typeof snapshot>)
    : null;
  return {
    id: row.id,
    campaignId: row.campaign_id,
    provenance: row.source_campaign_id ? 'campaign' : override ? 'override' : 'universe',
    name: override?.name ?? row.name,
    playerName: row.player_name,
    status: row.status,
    currentHitPoints: row.current_hit_points,
    maxHitPoints: override?.maxHitPoints ?? row.max_hit_points,
    portraitPath: override?.portraitPath ?? row.portrait_path,
    sheet: override ? parseSheet(JSON.stringify(override.sheet)) : parseSheet(row.sheet_json),
    sheetSchemaVersion: override?.sheetSchemaVersion ?? row.sheet_schema_version,
    createdAt: row.created_at,
    updatedAt: override?.updatedAt ?? row.updated_at,
  };
}

function snapshot(character: PlayerCharacter) {
  return {
    name: character.name,
    maxHitPoints: character.maxHitPoints,
    portraitPath: character.portraitPath,
    sheet: canonicalSheet(character.sheet),
    sheetSchemaVersion: character.sheetSchemaVersion,
    updatedAt: character.updatedAt,
  };
}

function canonicalSheet(sheet: PlayerCharacterSheet): PlayerCharacterSheet {
  return { ...sheet, privateNotes: '' };
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
    raceOptionId: typeof sheet['raceOptionId'] === 'string' ? sheet['raceOptionId'] : null,
    race:
      typeof sheet['race'] === 'string'
        ? sheet['race']
        : typeof sheet['species'] === 'string'
          ? sheet['species']
          : '',
    subraceOptionId: typeof sheet['subraceOptionId'] === 'string' ? sheet['subraceOptionId'] : null,
    subrace: typeof sheet['subrace'] === 'string' ? sheet['subrace'] : '',
    classOptionId: typeof sheet['classOptionId'] === 'string' ? sheet['classOptionId'] : null,
    senses: parseTags(sheet['senses']),
    languages: parseTags(sheet['languages']),
    conditions: parseTags(sheet['conditions']),
    privateNotes: '',
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
