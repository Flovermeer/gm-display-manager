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
  source_campaign_id: string | null;
  override_snapshot: string | null;
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
       LEFT JOIN campaign_resource_override AS resource_override
         ON resource_override.campaign_id=campaign_npc.campaign_id
        AND resource_override.resource_type='npc' AND resource_override.resource_id=npc.id
       WHERE campaign_npc.campaign_id = $1
         AND NOT (npc.source_campaign_id=$1 AND npc.deleted_at IS NOT NULL)
       ORDER BY npc.name COLLATE NOCASE, npc.id`,
      [campaignId],
    );

    return rows.map(mapNpcRow);
  }

  override async listAvailableByCampaign(campaignId: string): Promise<readonly Npc[]> {
    const rows = await (await this.getDatabase()).select<NpcRow[]>(
      `SELECT npc.id, campaign.id AS campaign_id, npc.name, 'active' AS status,
              '' AS summary, '' AS notes, npc.portrait_path, npc.idle_video_path,
              npc.sheet_json, npc.sheet_schema_version, npc.created_at, npc.updated_at,
              npc.source_campaign_id, NULL AS override_snapshot
       FROM campaign JOIN npc ON npc.universe_id IN (
         campaign.universe_id,
         (SELECT game_system_id || ':generic' FROM game_universe WHERE id=campaign.universe_id)
       )
       WHERE campaign.id=$1 AND npc.source_campaign_id IS NULL AND npc.deleted_at IS NULL
         AND NOT EXISTS (SELECT 1 FROM campaign_npc
           WHERE campaign_npc.campaign_id=$1 AND campaign_npc.npc_id=npc.id)
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
       LEFT JOIN campaign_resource_override AS resource_override
         ON resource_override.campaign_id=campaign_npc.campaign_id
        AND resource_override.resource_type='npc' AND resource_override.resource_id=npc.id
       WHERE campaign_npc.campaign_id = $1 AND npc.id = $2`,
      [campaignId, id],
    );

    return rows[0] ? mapNpcRow(rows[0]) : null;
  }

  override async save(npc: Npc): Promise<void> {
    const database = await this.getDatabase();
    if (npc.provenance !== 'campaign') {
      await database.execute(
        `INSERT INTO campaign_resource_override(
           campaign_id, resource_type, resource_id, snapshot_json, created_at, updated_at
         ) VALUES ($1,'npc',$2,$3,$4,$4)
         ON CONFLICT(campaign_id, resource_type, resource_id) DO UPDATE SET
           snapshot_json=excluded.snapshot_json, updated_at=excluded.updated_at`,
        [npc.campaignId, npc.id, JSON.stringify(snapshot(npc)), npc.updatedAt],
      );
    } else {
    await database.execute(
      `INSERT INTO npc (
         id, universe_id, name, portrait_path, idle_video_path,
         sheet_json, sheet_schema_version, created_at, updated_at, source_campaign_id
       ) VALUES ($1, (SELECT universe_id FROM campaign WHERE id=$2), $3, $4, $5, $6, $7, $8, $9, $2)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         portrait_path = excluded.portrait_path,
         idle_video_path = excluded.idle_video_path,
         sheet_json = excluded.sheet_json,
         sheet_schema_version = excluded.sheet_schema_version,
         updated_at = excluded.updated_at
       WHERE npc.universe_id = excluded.universe_id
         AND npc.source_campaign_id = excluded.source_campaign_id`,
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
    }
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
    const local = await database.execute(
      `UPDATE npc SET deleted_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP
       WHERE id=$2 AND source_campaign_id=$1`,
      [campaignId, id],
    );
    if (local.rowsAffected > 0) return;
    await database.execute(
      `DELETE FROM campaign_resource_override
       WHERE campaign_id=$1 AND resource_type='npc' AND resource_id=$2`,
      [campaignId, id],
    );
    await database.execute('DELETE FROM campaign_npc WHERE campaign_id = $1 AND npc_id = $2', [
      campaignId,
      id,
    ]);
  }

  override async attach(campaignId: string, id: string): Promise<void> {
    const result = await (await this.getDatabase()).execute(
      `INSERT INTO campaign_npc(campaign_id,npc_id,status,role_summary,created_at,updated_at)
       SELECT campaign.id,npc.id,'active','',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP
       FROM campaign JOIN npc ON npc.id=$2
       WHERE campaign.id=$1 AND npc.universe_id IN (
         campaign.universe_id,
         (SELECT game_system_id || ':generic' FROM game_universe WHERE id=campaign.universe_id)
       )
         AND npc.source_campaign_id IS NULL AND npc.deleted_at IS NULL
       ON CONFLICT(campaign_id,npc_id) DO NOTHING`,
      [campaignId, id],
    );
    if (result.rowsAffected === 0 && !(await this.findById(campaignId, id))) {
      throw new Error('Ce PNJ n’appartient pas à l’univers de la campagne.');
    }
  }

  override async promote(campaignId: string, id: string): Promise<void> {
    const result = await (await this.getDatabase()).execute(
      `UPDATE npc SET source_campaign_id=NULL, deleted_at=NULL, updated_at=CURRENT_TIMESTAMP
       WHERE id=$2 AND source_campaign_id=$1`,
      [campaignId, id],
    );
    if (result.rowsAffected === 0) throw new Error('Seul un PNJ local peut être enregistré dans l’univers.');
  }

  override async resetOverride(campaignId: string, id: string): Promise<void> {
    await (await this.getDatabase()).execute(
      `DELETE FROM campaign_resource_override
       WHERE campaign_id=$1 AND resource_type='npc' AND resource_id=$2`,
      [campaignId, id],
    );
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
                            npc.created_at, MAX(npc.updated_at, campaign_npc.updated_at) AS updated_at,
                            npc.source_campaign_id,
                            resource_override.snapshot_json AS override_snapshot`;

function mapNpcRow(row: NpcRow): Npc {
  const override = row.override_snapshot ? JSON.parse(row.override_snapshot) as ReturnType<typeof snapshot> : null;
  return {
    id: row.id,
    campaignId: row.campaign_id,
    provenance: row.source_campaign_id ? 'campaign' : override ? 'override' : 'universe',
    name: override?.name ?? row.name,
    status: row.status,
    summary: row.summary,
    notes: row.notes,
    portraitPath: override?.portraitPath ?? row.portrait_path,
    idleVideoPath: override?.idleVideoPath ?? row.idle_video_path,
    sheet: override ? normalizeNpcSheet(override.sheet) : parseSheet(row.sheet_json),
    sheetSchemaVersion: override?.sheetSchemaVersion ?? row.sheet_schema_version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function snapshot(npc: Npc) {
  return { name: npc.name, portraitPath: npc.portraitPath, idleVideoPath: npc.idleVideoPath,
    sheet: npc.sheet, sheetSchemaVersion: npc.sheetSchemaVersion, updatedAt: npc.updatedAt };
}

function parseSheet(value: string) {
  return normalizeNpcSheet(JSON.parse(value) as unknown);
}
