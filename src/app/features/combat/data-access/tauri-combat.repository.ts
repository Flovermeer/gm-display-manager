/**
 * But
 * Persiste le combat actif et ses combattants dans SQLite.
 *
 * Responsabilit\u00e9s
 * - conserve un seul combat actif par campagne ;
 * - laisse les PV des PJ dans leur \u00e9tat de campagne existant.
 */

import { Injectable } from '@angular/core';
import Database from '@tauri-apps/plugin-sql';

import { CombatRepository } from '@app/features/combat/data-access/combat.repository';
import {
  sortCombatants,
  type ActiveCombat,
  type Combatant,
  type CombatantKind,
} from '@app/features/combat/domain/combat';

const DATABASE_URL = 'sqlite:beholders-inn.db';

type CombatRow = Readonly<{
  id: string;
  campaign_id: string;
  started_at: string;
  updated_at: string;
}>;

type CombatantRow = Readonly<{
  id: string;
  combat_id: string;
  kind: CombatantKind;
  resource_id: string;
  display_name: string;
  initiative: number;
  current_hit_points: number | null;
  max_hit_points: number | null;
  added_order: number;
  created_at: string;
  updated_at: string;
}>;

@Injectable()
export class TauriCombatRepository extends CombatRepository {
  private databasePromise?: Promise<Database>;

  override async findActive(campaignId: string): Promise<ActiveCombat | null> {
    const database = await this.database();
    const rows = await database.select<CombatRow[]>(
      `SELECT id, campaign_id, started_at, updated_at
       FROM active_combat WHERE campaign_id=$1`,
      [campaignId],
    );
    const row = rows[0];
    if (!row) return null;
    const combatants = await database.select<CombatantRow[]>(
      `SELECT id, combat_id, kind, resource_id, display_name, initiative,
              current_hit_points, max_hit_points, added_order, created_at, updated_at
       FROM combatant WHERE combat_id=$1`,
      [row.id],
    );
    return {
      id: row.id,
      campaignId: row.campaign_id,
      startedAt: row.started_at,
      updatedAt: row.updated_at,
      combatants: sortCombatants(combatants.map(mapCombatant)),
    };
  }

  override async create(combat: ActiveCombat): Promise<void> {
    const result = await (
      await this.database()
    ).execute(
      `INSERT INTO active_combat(id, campaign_id, started_at, updated_at)
       VALUES ($1,$2,$3,$4)`,
      [combat.id, combat.campaignId, combat.startedAt, combat.updatedAt],
    );
    if (result.rowsAffected !== 1) throw new Error('Impossible de cr\u00e9er le combat.');
  }

  override async saveCombatant(combat: ActiveCombat, combatant: Combatant): Promise<void> {
    const playerCharacter = combatant.kind === 'player-character';
    const database = await this.database();
    const result = await database.execute(
      `INSERT INTO combatant(
         id, combat_id, kind, resource_id, display_name, initiative,
         current_hit_points, max_hit_points, added_order, created_at, updated_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT(id) DO UPDATE SET display_name=excluded.display_name,
         initiative=excluded.initiative, current_hit_points=excluded.current_hit_points,
         max_hit_points=excluded.max_hit_points, updated_at=excluded.updated_at
       WHERE combatant.combat_id=excluded.combat_id`,
      [
        combatant.id,
        combat.id,
        combatant.kind,
        combatant.resourceId,
        combatant.displayName,
        combatant.initiative,
        playerCharacter ? null : combatant.currentHitPoints,
        playerCharacter ? null : combatant.maxHitPoints,
        combatant.addedOrder,
        combatant.createdAt,
        combatant.updatedAt,
      ],
    );
    if (result.rowsAffected !== 1)
      throw new Error('Impossible de mettre \u00e0 jour le combattant.');
    await this.touch(database, combat);
  }

  override async removeCombatant(combat: ActiveCombat, combatantId: string): Promise<void> {
    const database = await this.database();
    await database.execute('DELETE FROM combatant WHERE combat_id=$1 AND id=$2', [
      combat.id,
      combatantId,
    ]);
    await this.touch(database, combat);
  }

  override async delete(campaignId: string): Promise<void> {
    await (
      await this.database()
    ).execute('DELETE FROM active_combat WHERE campaign_id=$1', [campaignId]);
  }

  private touch(database: Database, combat: ActiveCombat): Promise<unknown> {
    return database.execute(
      'UPDATE active_combat SET updated_at=$2 WHERE id=$1 AND campaign_id=$3',
      [combat.id, combat.updatedAt, combat.campaignId],
    );
  }

  private database(): Promise<Database> {
    this.databasePromise ??= Database.load(DATABASE_URL).catch((error: unknown) => {
      this.databasePromise = undefined;
      throw error;
    });
    return this.databasePromise;
  }
}

function mapCombatant(row: CombatantRow): Combatant {
  return {
    id: row.id,
    combatId: row.combat_id,
    kind: row.kind,
    resourceId: row.resource_id,
    displayName: row.display_name,
    initiative: row.initiative,
    currentHitPoints: row.current_hit_points,
    maxHitPoints: row.max_hit_points,
    addedOrder: row.added_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
