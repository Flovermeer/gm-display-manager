/**
 * But
 * Persiste les fiches PNJ dans SQLite.
 *
 * Responsabilités
 * - sérialise les données structurées de la fiche ;
 * - normalise les anciennes données lors de la lecture ;
 */

import { Injectable } from '@angular/core';
import Database from '@tauri-apps/plugin-sql';

import { normalizeNpcSheet, type Npc, type NpcStatus } from '@app/features/npcs/domain/npc';
import { NpcRepository } from '@app/features/npcs/data-access/npc.repository';

const DATABASE_URL = 'sqlite:beholders-inn.db';

type NpcRow = Readonly<{
  id: string;
  campaign_id: string;
  name: string;
  status: NpcStatus;
  summary: string;
  notes: string;
  portrait_path: string | null;
  idle_video_path: string | null;
  sheet_json: string;
  sheet_schema_version: number;
  created_at: string;
  updated_at: string;
}>;

@Injectable()
export class TauriNpcRepository extends NpcRepository {
  private databasePromise?: Promise<Database>;

  override async listByCampaign(campaignId: string): Promise<readonly Npc[]> {
    const database = await this.getDatabase();
    const rows = await database.select<NpcRow[]>(
      `${NPC_COLUMNS}
       FROM campaign_npc
       JOIN npc ON npc.id = campaign_npc.npc_id
       WHERE campaign_npc.campaign_id = $1
       ORDER BY npc.name COLLATE NOCASE, npc.id`,
      [campaignId],
    );

    return rows.map(mapNpcRow);
  }

  override async findById(campaignId: string, id: string): Promise<Npc | null> {
    const database = await this.getDatabase();
    const rows = await database.select<NpcRow[]>(
      `${NPC_COLUMNS}
       FROM campaign_npc
       JOIN npc ON npc.id = campaign_npc.npc_id
       WHERE campaign_npc.campaign_id = $1 AND npc.id = $2`,
      [campaignId, id],
    );

    return rows[0] ? mapNpcRow(rows[0]) : null;
  }

  override async save(npc: Npc): Promise<void> {
    const database = await this.getDatabase();
    await database.execute(
      `INSERT INTO npc (
         id, universe_id, name, portrait_path, idle_video_path,
         sheet_json, sheet_schema_version, created_at, updated_at
       ) VALUES ($1, (SELECT universe_id FROM campaign WHERE id=$2), $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         portrait_path = excluded.portrait_path,
         idle_video_path = excluded.idle_video_path,
         sheet_json = excluded.sheet_json,
         sheet_schema_version = excluded.sheet_schema_version,
         updated_at = excluded.updated_at
       WHERE npc.universe_id = excluded.universe_id`,
      [
        npc.id,
        npc.campaignId,
        npc.name,
        npc.portraitPath,
        npc.idleVideoPath,
        JSON.stringify(npc.sheet),
        npc.sheetSchemaVersion,
        npc.createdAt,
        npc.updatedAt,
      ],
    );
    await database.execute(
      `INSERT INTO campaign_npc(
         campaign_id, npc_id, status, role_summary, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT(campaign_id, npc_id) DO UPDATE SET
         status=excluded.status, role_summary=excluded.role_summary,
         updated_at=excluded.updated_at`,
      [npc.campaignId, npc.id, npc.status, npc.summary, npc.createdAt, npc.updatedAt],
    );
  }

  override async delete(campaignId: string, id: string): Promise<void> {
    const database = await this.getDatabase();
    await database.execute('DELETE FROM campaign_npc WHERE campaign_id = $1 AND npc_id = $2', [
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

const NPC_COLUMNS = `SELECT npc.id, campaign_npc.campaign_id, npc.name,
                            campaign_npc.status, campaign_npc.role_summary AS summary,
                            '' AS notes, npc.portrait_path, npc.idle_video_path,
                            npc.sheet_json, npc.sheet_schema_version,
                            npc.created_at, MAX(npc.updated_at, campaign_npc.updated_at) AS updated_at`;

function mapNpcRow(row: NpcRow): Npc {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    name: row.name,
    status: row.status,
    summary: row.summary,
    notes: row.notes,
    portraitPath: row.portrait_path,
    idleVideoPath: row.idle_video_path,
    sheet: parseSheet(row.sheet_json),
    sheetSchemaVersion: row.sheet_schema_version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parseSheet(value: string) {
  return normalizeNpcSheet(JSON.parse(value) as unknown);
}
