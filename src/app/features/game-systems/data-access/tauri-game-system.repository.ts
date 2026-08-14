/**
 * But
 * Persiste les systèmes de jeu et univers dans SQLite via Tauri.
 *
 * Responsabilités
 * - applique les filtres de corbeille ;
 * - exécute les suppressions logiques et les purges explicites.
 */

import { Injectable } from '@angular/core';
import Database from '@tauri-apps/plugin-sql';

import { GameSystemRepository } from '@app/features/game-systems/data-access/game-system.repository';
import type { GameSystem, GameUniverse } from '@app/features/game-systems/domain/game-system';

const DATABASE_URL = 'sqlite:beholders-inn.db';

type GameSystemRow = Readonly<{
  id: string;
  name: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}>;

type GameUniverseRow = GameSystemRow & Readonly<{ game_system_id: string }>;

@Injectable()
export class TauriGameSystemRepository extends GameSystemRepository {
  private databasePromise?: Promise<Database>;

  override async listSystems(includeDeleted = false): Promise<readonly GameSystem[]> {
    const database = await this.getDatabase();
    const rows = await database.select<GameSystemRow[]>(
      `SELECT id, name, deleted_at, created_at, updated_at FROM game_system
       ${includeDeleted ? '' : 'WHERE deleted_at IS NULL'}
       ORDER BY name COLLATE NOCASE, id`,
    );
    return rows.map(mapSystem);
  }

  override async saveSystem(gameSystem: GameSystem): Promise<void> {
    const database = await this.getDatabase();
    await database.execute(
      `INSERT INTO game_system(id, name, deleted_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT(id) DO UPDATE SET name=excluded.name, updated_at=excluded.updated_at`,
      [
        gameSystem.id,
        gameSystem.name,
        gameSystem.deletedAt,
        gameSystem.createdAt,
        gameSystem.updatedAt,
      ],
    );
  }

  override async setSystemDeletedAt(id: string, deletedAt: string | null): Promise<void> {
    const database = await this.getDatabase();
    await database.execute(
      'UPDATE game_system SET deleted_at=$2, updated_at=CURRENT_TIMESTAMP WHERE id=$1',
      [id, deletedAt],
    );
  }

  override async purgeSystem(id: string): Promise<void> {
    const database = await this.getDatabase();
    await database.execute('DELETE FROM game_system WHERE id=$1 AND deleted_at IS NOT NULL', [id]);
  }

  override async listUniverses(
    gameSystemId: string,
    includeDeleted = false,
  ): Promise<readonly GameUniverse[]> {
    const database = await this.getDatabase();
    const rows = await database.select<GameUniverseRow[]>(
      `SELECT id, game_system_id, name, deleted_at, created_at, updated_at
       FROM game_universe WHERE game_system_id=$1
       ${includeDeleted ? '' : 'AND deleted_at IS NULL'}
       ORDER BY name COLLATE NOCASE, id`,
      [gameSystemId],
    );
    return rows.map(mapUniverse);
  }

  override async findUniverse(id: string): Promise<GameUniverse | null> {
    const database = await this.getDatabase();
    const rows = await database.select<GameUniverseRow[]>(
      `SELECT id, game_system_id, name, deleted_at, created_at, updated_at
       FROM game_universe WHERE id=$1`,
      [id],
    );
    return rows[0] ? mapUniverse(rows[0]) : null;
  }

  override async saveUniverse(universe: GameUniverse): Promise<void> {
    const database = await this.getDatabase();
    await database.execute(
      `INSERT INTO game_universe(
         id, game_system_id, name, deleted_at, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT(id) DO UPDATE SET name=excluded.name, updated_at=excluded.updated_at`,
      [
        universe.id,
        universe.gameSystemId,
        universe.name,
        universe.deletedAt,
        universe.createdAt,
        universe.updatedAt,
      ],
    );
  }

  override async setUniverseDeletedAt(id: string, deletedAt: string | null): Promise<void> {
    const database = await this.getDatabase();
    await database.execute(
      'UPDATE game_universe SET deleted_at=$2, updated_at=CURRENT_TIMESTAMP WHERE id=$1',
      [id, deletedAt],
    );
  }

  override async purgeUniverse(id: string): Promise<void> {
    const database = await this.getDatabase();
    await database.execute('DELETE FROM game_universe WHERE id=$1 AND deleted_at IS NOT NULL', [id]);
  }

  private getDatabase(): Promise<Database> {
    this.databasePromise ??= Database.load(DATABASE_URL).catch((error: unknown) => {
      this.databasePromise = undefined;
      throw error;
    });
    return this.databasePromise;
  }
}

function mapSystem(row: GameSystemRow): GameSystem {
  return {
    id: row.id,
    name: row.name,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapUniverse(row: GameUniverseRow): GameUniverse {
  return {
    id: row.id,
    gameSystemId: row.game_system_id,
    name: row.name,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
