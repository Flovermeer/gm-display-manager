/**
 * But
 * Persiste les scènes et leurs relations dans SQLite.
 *
 * Responsabilités
 * - gère les associations PNJ, monstres et objets ;
 * - reconstruit le modèle complet à la lecture ;
 */

import { Injectable } from '@angular/core';
import Database from '@tauri-apps/plugin-sql';

import type { Scene } from '@app/features/scenes/domain/scene';
import { SceneRepository } from '@app/features/scenes/data-access/scene.repository';

const DATABASE_URL = 'sqlite:beholders-inn.db';

type SceneRow = Readonly<{
  id: string;
  campaign_id: string;
  name: string;
  summary: string;
  location_id: string | null;
  created_at: string;
  updated_at: string;
}>;

type RelationRow = Readonly<{ scene_id: string; resource_id: string }>;

@Injectable()
export class TauriSceneRepository extends SceneRepository {
  private databasePromise?: Promise<Database>;

  override async listByCampaign(campaignId: string): Promise<readonly Scene[]> {
    const database = await this.getDatabase();
    const rows = await database.select<SceneRow[]>(
      `${SCENE_COLUMNS} FROM scene WHERE campaign_id = $1 ORDER BY name COLLATE NOCASE, id`,
      [campaignId],
    );
    return this.withRelations(database, rows);
  }

  override async findById(campaignId: string, id: string): Promise<Scene | null> {
    const database = await this.getDatabase();
    const rows = await database.select<SceneRow[]>(
      `${SCENE_COLUMNS} FROM scene WHERE campaign_id = $1 AND id = $2`,
      [campaignId, id],
    );
    const scenes = await this.withRelations(database, rows);
    return scenes[0] ?? null;
  }

  override async save(scene: Scene): Promise<void> {
    const database = await this.getDatabase();
    await database.execute(
      `INSERT INTO scene (id, campaign_id, name, summary, location_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT(id) DO UPDATE SET name = excluded.name, summary = excluded.summary,
         location_id = excluded.location_id, updated_at = excluded.updated_at
       WHERE scene.campaign_id = excluded.campaign_id`,
      [
        scene.id,
        scene.campaignId,
        scene.name,
        scene.summary,
        scene.locationId,
        scene.createdAt,
        scene.updatedAt,
      ],
    );
    await database.execute('DELETE FROM scene_npc WHERE scene_id = $1', [scene.id]);
    await database.execute('DELETE FROM scene_monster WHERE scene_id = $1', [scene.id]);
    await database.execute('DELETE FROM scene_item WHERE scene_id = $1', [scene.id]);
    for (const npcId of scene.npcIds) {
      await database.execute('INSERT INTO scene_npc (scene_id, npc_id) VALUES ($1, $2)', [
        scene.id,
        npcId,
      ]);
    }
    for (const monsterId of scene.monsterIds) {
      await database.execute('INSERT INTO scene_monster (scene_id, monster_id) VALUES ($1, $2)', [
        scene.id,
        monsterId,
      ]);
    }
    for (const itemId of scene.itemIds) {
      await database.execute('INSERT INTO scene_item (scene_id, item_id) VALUES ($1, $2)', [
        scene.id,
        itemId,
      ]);
    }
  }

  override async delete(campaignId: string, id: string): Promise<void> {
    const database = await this.getDatabase();
    await database.execute('DELETE FROM scene WHERE campaign_id = $1 AND id = $2', [
      campaignId,
      id,
    ]);
  }

  private async withRelations(database: Database, rows: readonly SceneRow[]): Promise<Scene[]> {
    if (rows.length === 0) return [];
    const sceneIds = new Set(rows.map(({ id }) => id));
    const campaignId = rows[0].campaign_id;
    const [npcRows, monsterRows, itemRows] = await Promise.all([
      database.select<RelationRow[]>(
        `SELECT scene_npc.scene_id, scene_npc.npc_id AS resource_id
         FROM scene_npc JOIN scene ON scene.id = scene_npc.scene_id
         WHERE scene.campaign_id = $1 ORDER BY scene_npc.npc_id`,
        [campaignId],
      ),
      database.select<RelationRow[]>(
        `SELECT scene_monster.scene_id, scene_monster.monster_id AS resource_id
         FROM scene_monster JOIN scene ON scene.id = scene_monster.scene_id
         WHERE scene.campaign_id = $1 ORDER BY scene_monster.monster_id`,
        [campaignId],
      ),
      database.select<RelationRow[]>(
        `SELECT scene_item.scene_id, scene_item.item_id AS resource_id
         FROM scene_item JOIN scene ON scene.id = scene_item.scene_id
         WHERE scene.campaign_id = $1 ORDER BY scene_item.item_id`,
        [campaignId],
      ),
    ]);
    return rows.map((row) => ({
      id: row.id,
      campaignId: row.campaign_id,
      name: row.name,
      summary: row.summary,
      locationId: row.location_id,
      npcIds: npcRows
        .filter(({ scene_id }) => scene_id === row.id && sceneIds.has(scene_id))
        .map(({ resource_id }) => resource_id),
      monsterIds: monsterRows
        .filter(({ scene_id }) => scene_id === row.id && sceneIds.has(scene_id))
        .map(({ resource_id }) => resource_id),
      itemIds: itemRows
        .filter(({ scene_id }) => scene_id === row.id && sceneIds.has(scene_id))
        .map(({ resource_id }) => resource_id),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  private getDatabase(): Promise<Database> {
    this.databasePromise ??= Database.load(DATABASE_URL).catch((error: unknown) => {
      this.databasePromise = undefined;
      throw error;
    });
    return this.databasePromise;
  }
}

const SCENE_COLUMNS = 'SELECT id, campaign_id, name, summary, location_id, created_at, updated_at';
