/**
 * But
 * Persiste les référentiels de règles dans SQLite via Tauri.
 *
 * Responsabilités
 * - charge les valeurs disponibles à un niveau donné ;
 * - garantit qu’un ajout d’univers reste rattaché à son système.
 */

import { Injectable } from '@angular/core';
import Database from '@tauri-apps/plugin-sql';

import { GameRuleOptionRepository } from '@app/features/game-systems/data-access/game-rule-option.repository';
import type {
  GameRuleCategory,
  GameRuleOption,
} from '@app/features/game-systems/domain/game-rule-option';

const DATABASE_URL = 'sqlite:beholders-inn.db';

type RuleOptionRow = Readonly<{
  id: string;
  game_system_id: string;
  universe_id: string | null;
  category: GameRuleCategory;
  parent_option_id: string | null;
  code: string;
  label: string;
  created_at: string;
  updated_at: string;
}>;

@Injectable()
export class TauriGameRuleOptionRepository extends GameRuleOptionRepository {
  private databasePromise?: Promise<Database>;

  override async listForSystem(
    gameSystemId: string,
    category: GameRuleCategory,
  ): Promise<readonly GameRuleOption[]> {
    const database = await this.getDatabase();
    const rows = await database.select<RuleOptionRow[]>(
      `${COLUMNS} WHERE game_system_id=$1 AND universe_id IS NULL AND category=$2
       ORDER BY label COLLATE NOCASE, id`,
      [gameSystemId, category],
    );
    return rows.map(mapOption);
  }

  override async listForUniverse(
    gameSystemId: string,
    universeId: string,
    category: GameRuleCategory,
  ): Promise<readonly GameRuleOption[]> {
    const database = await this.getDatabase();
    const rows = await database.select<RuleOptionRow[]>(
      `${COLUMNS} WHERE game_system_id=$1 AND category=$2
       AND (universe_id IS NULL OR universe_id=$3)
       ORDER BY universe_id IS NOT NULL, label COLLATE NOCASE, id`,
      [gameSystemId, category, universeId],
    );
    return rows.map(mapOption);
  }

  override async save(option: GameRuleOption): Promise<void> {
    const database = await this.getDatabase();
    await database.execute(
      `INSERT INTO game_rule_option(
         id, game_system_id, universe_id, category, parent_option_id,
         code, label, created_at, updated_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        option.id,
        option.gameSystemId,
        option.universeId,
        option.category,
        option.parentOptionId,
        option.code,
        option.label,
        option.createdAt,
        option.updatedAt,
      ],
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

const COLUMNS = `SELECT id, game_system_id, universe_id, category, parent_option_id,
  code, label, created_at, updated_at FROM game_rule_option`;

function mapOption(row: RuleOptionRow): GameRuleOption {
  return {
    id: row.id,
    gameSystemId: row.game_system_id,
    universeId: row.universe_id,
    category: row.category,
    parentOptionId: row.parent_option_id,
    code: row.code,
    label: row.label,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
