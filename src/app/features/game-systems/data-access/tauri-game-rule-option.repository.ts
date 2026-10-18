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
import { genericUniverseId } from '@app/features/game-systems/domain/game-system';
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
    const genericId = genericUniverseId(gameSystemId);
    const rows = await database.select<RuleOptionRow[]>(
      `${COLUMNS} WHERE game_system_id=$1 AND category=$2
       AND (universe_id IS NULL OR universe_id=$4
         OR (category IN ('race', 'class') AND universe_id=$3))
       ORDER BY universe_id IS NOT NULL, universe_id=$4, label COLLATE NOCASE, id`,
      [gameSystemId, category, genericId, universeId],
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

  override async remove(option: GameRuleOption): Promise<boolean> {
    if (!option.universeId) return false;
    const database = await this.getDatabase();
    const path =
      option.category === 'language'
        ? '$.languageOptionIds'
        : `$.${OPTION_ID_FIELD[option.category]}`;
    const usesOption = (column: string): string =>
      option.category === 'language'
        ? `EXISTS (SELECT 1 FROM json_each(json_extract(${column}, '${path}'))
            WHERE value = $1)`
        : `json_extract(${column}, '${path}') = $1`;
    const overridePath =
      option.category === 'language'
        ? '$.sheet.languageOptionIds'
        : `$.sheet.${OPTION_ID_FIELD[option.category]}`;
    const overrideUsesOption =
      option.category === 'language'
        ? `EXISTS (SELECT 1 FROM json_each(json_extract(snapshot_json, '${overridePath}'))
          WHERE value = $1)`
        : `json_extract(snapshot_json, '${overridePath}') = $1`;

    const result = await database.execute(
      `DELETE FROM game_rule_option
       WHERE id = $1 AND universe_id = $2
         AND NOT EXISTS (
           SELECT 1 FROM game_rule_option AS child WHERE child.parent_option_id = $1
         )
         AND NOT EXISTS (
           SELECT 1 FROM npc WHERE ${usesOption('sheet_json')}
         )
         AND NOT EXISTS (
           SELECT 1 FROM monster WHERE ${usesOption('sheet_json')}
         )
         AND NOT EXISTS (
           SELECT 1 FROM player_character WHERE ${usesOption('sheet_json')}
         )
         AND NOT EXISTS (
           SELECT 1 FROM campaign_resource_override WHERE ${overrideUsesOption}
         )`,
      [option.id, option.universeId],
    );
    return result.rowsAffected === 1;
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

const OPTION_ID_FIELD: Record<GameRuleCategory, string> = {
  alignment: 'alignmentOptionId',
  size: 'sizeOptionId',
  creature_type: 'creatureTypeOptionId',
  creature_subspecies: 'creatureSubspeciesOptionId',
  language: 'languageOptionIds',
  race: 'raceOptionId',
  class: 'classOptionId',
};

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
