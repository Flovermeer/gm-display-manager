/**
 * But
 * Persiste les monstres partagés et leurs associations dans SQLite.
 *
 * Responsabilités
 * - projette une fiche canonique dans le contexte de la campagne ;
 * - empêche l’association d’un monstre provenant d’un autre univers.
 */

import { Injectable } from '@angular/core';
import Database from '@tauri-apps/plugin-sql';

import { MonsterRepository } from '@app/features/bestiary/data-access/monster.repository';
import { normalizeNpcSheet } from '@app/features/npcs/domain/npc';
import type { Monster } from '@app/features/bestiary/domain/monster';

const DATABASE_URL = 'sqlite:beholders-inn.db';

type MonsterRow = Readonly<{
  id: string;
  campaign_id: string;
  name: string;
  image_path: string | null;
  sheet_json: string;
  sheet_schema_version: number;
  created_at: string;
  updated_at: string;
  source_campaign_id: string | null;
  override_snapshot: string | null;
}>;

@Injectable()
export class TauriMonsterRepository extends MonsterRepository {
  private databasePromise?: Promise<Database>;

  override listByCampaign(campaignId: string): Promise<readonly Monster[]> {
    return this.select(
      `${MONSTER_COLUMNS}
       FROM campaign_monster
       JOIN monster ON monster.id=campaign_monster.monster_id
       LEFT JOIN campaign_resource_override AS resource_override
         ON resource_override.campaign_id=campaign_monster.campaign_id
        AND resource_override.resource_type='monster'
        AND resource_override.resource_id=monster.id
       WHERE campaign_monster.campaign_id=$1
         AND NOT (monster.source_campaign_id=$1 AND monster.deleted_at IS NOT NULL)
       ORDER BY monster.name COLLATE NOCASE, monster.id`,
      [campaignId],
    );
  }

  override listAvailableByCampaign(campaignId: string): Promise<readonly Monster[]> {
    return this.select(
      `SELECT monster.id, campaign.id AS campaign_id, monster.name, monster.image_path,
              monster.sheet_json, monster.sheet_schema_version,
              monster.created_at, monster.updated_at, monster.source_campaign_id,
              NULL AS override_snapshot
       FROM campaign
       JOIN monster ON monster.universe_id=campaign.universe_id
       WHERE campaign.id=$1 AND monster.source_campaign_id IS NULL
         AND monster.deleted_at IS NULL AND NOT EXISTS (
         SELECT 1 FROM campaign_monster
         WHERE campaign_monster.campaign_id=campaign.id
           AND campaign_monster.monster_id=monster.id
       )
       ORDER BY monster.name COLLATE NOCASE, monster.id`,
      [campaignId],
    );
  }

  override async findById(campaignId: string, id: string): Promise<Monster | null> {
    const rows = await this.select(
      `${MONSTER_COLUMNS}
       FROM campaign_monster
       JOIN monster ON monster.id=campaign_monster.monster_id
       LEFT JOIN campaign_resource_override AS resource_override
         ON resource_override.campaign_id=campaign_monster.campaign_id
        AND resource_override.resource_type='monster'
        AND resource_override.resource_id=monster.id
       WHERE campaign_monster.campaign_id=$1 AND monster.id=$2`,
      [campaignId, id],
    );
    return rows[0] ?? null;
  }

  override async save(monster: Monster): Promise<void> {
    const database = await this.database();
    if (monster.provenance !== 'campaign') {
      await database.execute(
        `INSERT INTO campaign_resource_override(
           campaign_id, resource_type, resource_id, snapshot_json, created_at, updated_at
         ) VALUES ($1, 'monster', $2, $3, $4, $4)
         ON CONFLICT(campaign_id, resource_type, resource_id) DO UPDATE SET
           snapshot_json=excluded.snapshot_json, updated_at=excluded.updated_at`,
        [monster.campaignId, monster.id, JSON.stringify(snapshot(monster)), monster.updatedAt],
      );
      return;
    }
    await database.execute(
      `INSERT INTO monster(
         id, universe_id, name, image_path, sheet_json, sheet_schema_version,
         created_at, updated_at, source_campaign_id
       ) VALUES ($1, (SELECT universe_id FROM campaign WHERE id=$2), $3, $4, $5, $6, $7, $8, $2)
       ON CONFLICT(id) DO UPDATE SET
         name=excluded.name, image_path=excluded.image_path,
         sheet_json=excluded.sheet_json,
         sheet_schema_version=excluded.sheet_schema_version,
         updated_at=excluded.updated_at
       WHERE monster.universe_id=excluded.universe_id
         AND monster.source_campaign_id=excluded.source_campaign_id`,
      [
        monster.id,
        monster.campaignId,
        monster.name,
        monster.imagePath,
        JSON.stringify(monster.sheet),
        monster.sheetSchemaVersion,
        monster.createdAt,
        monster.updatedAt,
      ],
    );
    await this.attach(monster.campaignId, monster.id);
  }

  override async attach(campaignId: string, monsterId: string): Promise<void> {
    const database = await this.database();
    const result = await database.execute(
      `INSERT INTO campaign_monster(campaign_id, monster_id, created_at)
       SELECT campaign.id, monster.id, CURRENT_TIMESTAMP
       FROM campaign JOIN monster ON monster.id=$2
       WHERE campaign.id=$1 AND campaign.universe_id=monster.universe_id
       ON CONFLICT(campaign_id, monster_id) DO NOTHING`,
      [campaignId, monsterId],
    );
    if (result.rowsAffected === 0) {
      const existing = await this.findById(campaignId, monsterId);
      if (!existing) throw new Error('Ce monstre n’appartient pas à l’univers de la campagne.');
    }
  }

  override async detach(campaignId: string, monsterId: string): Promise<void> {
    const database = await this.database();
    const local = await database.execute(
      `UPDATE monster SET deleted_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP
       WHERE id=$2 AND source_campaign_id=$1`,
      [campaignId, monsterId],
    );
    if (local.rowsAffected > 0) return;
    await database.execute(
      `DELETE FROM campaign_resource_override
       WHERE campaign_id=$1 AND resource_type='monster' AND resource_id=$2`,
      [campaignId, monsterId],
    );
    await database.execute('DELETE FROM campaign_monster WHERE campaign_id=$1 AND monster_id=$2', [
      campaignId,
      monsterId,
    ]);
  }

  override async promote(campaignId: string, monsterId: string): Promise<void> {
    const result = await (await this.database()).execute(
      `UPDATE monster SET source_campaign_id=NULL, deleted_at=NULL, updated_at=CURRENT_TIMESTAMP
       WHERE id=$2 AND source_campaign_id=$1`,
      [campaignId, monsterId],
    );
    if (result.rowsAffected === 0) throw new Error('Seule une fiche locale peut être enregistrée dans l’univers.');
  }

  override async resetOverride(campaignId: string, monsterId: string): Promise<void> {
    await (await this.database()).execute(
      `DELETE FROM campaign_resource_override
       WHERE campaign_id=$1 AND resource_type='monster' AND resource_id=$2`,
      [campaignId, monsterId],
    );
  }

  private async select(query: string, values: readonly unknown[]): Promise<readonly Monster[]> {
    const rows = await (await this.database()).select<MonsterRow[]>(query, [...values]);
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

const MONSTER_COLUMNS = `SELECT monster.id, campaign_monster.campaign_id, monster.name,
  monster.image_path, monster.sheet_json, monster.sheet_schema_version,
  monster.created_at, monster.updated_at, monster.source_campaign_id,
  resource_override.snapshot_json AS override_snapshot`;

function mapRow(row: MonsterRow): Monster {
  const override = row.override_snapshot
    ? (JSON.parse(row.override_snapshot) as ReturnType<typeof snapshot>)
    : null;
  return {
    id: row.id,
    campaignId: row.campaign_id,
    provenance: row.source_campaign_id ? 'campaign' : override ? 'override' : 'universe',
    name: override?.name ?? row.name,
    imagePath: override?.imagePath ?? row.image_path,
    sheet: normalizeNpcSheet(override?.sheet ?? (JSON.parse(row.sheet_json) as unknown)),
    sheetSchemaVersion: override?.sheetSchemaVersion ?? row.sheet_schema_version,
    createdAt: row.created_at,
    updatedAt: override?.updatedAt ?? row.updated_at,
  };
}

function snapshot(monster: Monster) {
  return {
    name: monster.name,
    imagePath: monster.imagePath,
    sheet: monster.sheet,
    sheetSchemaVersion: monster.sheetSchemaVersion,
    updatedAt: monster.updatedAt,
  };
}
