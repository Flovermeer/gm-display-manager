/**
 * But
 * Persiste les tables aléatoires et leurs entrées dans SQLite.
 *
 * Responsabilités
 * - sauvegarde atomiquement chaque agrégat dans une ligne ;
 * - valide et convertit le JSON versionné des entrées.
 */

import { Injectable } from '@angular/core';
import Database from '@tauri-apps/plugin-sql';

import { RandomTableRepository } from '@app/features/random-tables/data-access/random-table.repository';
import {
  normalizeRandomTableEntries,
  RANDOM_TABLE_ENTRY_SCHEMA_VERSION,
  type RandomTable,
  type RandomTableEntry,
  type RandomTableEntryInput,
} from '@app/features/random-tables/domain/random-table';

const DATABASE_URL = 'sqlite:beholders-inn.db';

type RandomTableRow = Readonly<{
  id: string;
  campaign_id: string;
  name: string;
  description: string;
  entries_json: string;
  entry_schema_version: number;
  created_at: string;
  updated_at: string;
}>;

@Injectable()
export class TauriRandomTableRepository extends RandomTableRepository {
  private databasePromise?: Promise<Database>;

  override async listByCampaign(campaignId: string): Promise<readonly RandomTable[]> {
    const rows = await (
      await this.database()
    ).select<RandomTableRow[]>(
      `${RANDOM_TABLE_COLUMNS}
       WHERE campaign_id=$1
       ORDER BY name COLLATE NOCASE, id`,
      [campaignId],
    );
    return rows.map(mapRandomTable);
  }

  override async findById(campaignId: string, id: string): Promise<RandomTable | null> {
    const rows = await (
      await this.database()
    ).select<RandomTableRow[]>(
      `${RANDOM_TABLE_COLUMNS}
       WHERE campaign_id=$1 AND id=$2`,
      [campaignId, id],
    );
    return rows[0] ? mapRandomTable(rows[0]) : null;
  }

  override async save(table: RandomTable): Promise<void> {
    const result = await (
      await this.database()
    ).execute(
      `INSERT INTO random_table(
         id, campaign_id, name, description, entries_json, entry_schema_version,
         created_at, updated_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT(id) DO UPDATE SET
         name=excluded.name,
         description=excluded.description,
         entries_json=excluded.entries_json,
         entry_schema_version=excluded.entry_schema_version,
         updated_at=excluded.updated_at
       WHERE random_table.campaign_id=excluded.campaign_id`,
      [
        table.id,
        table.campaignId,
        table.name,
        table.description,
        JSON.stringify(table.entries),
        RANDOM_TABLE_ENTRY_SCHEMA_VERSION,
        table.createdAt,
        table.updatedAt,
      ],
    );
    if (result.rowsAffected !== 1) throw new Error("Impossible d'enregistrer la table aléatoire.");
  }

  override async delete(campaignId: string, id: string): Promise<void> {
    await (
      await this.database()
    ).execute('DELETE FROM random_table WHERE campaign_id=$1 AND id=$2', [campaignId, id]);
  }

  private database(): Promise<Database> {
    this.databasePromise ??= Database.load(DATABASE_URL).catch((error: unknown) => {
      this.databasePromise = undefined;
      throw error;
    });
    return this.databasePromise;
  }
}

const RANDOM_TABLE_COLUMNS = `SELECT id, campaign_id, name, description, entries_json,
                                     entry_schema_version, created_at, updated_at
                              FROM random_table`;

function mapRandomTable(row: RandomTableRow): RandomTable {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    name: row.name,
    description: row.description,
    entries: parseEntries(row.entries_json, row.entry_schema_version),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parseEntries(value: string, schemaVersion: number): readonly RandomTableEntry[] {
  if (schemaVersion !== RANDOM_TABLE_ENTRY_SCHEMA_VERSION) {
    throw new Error(`Version d'entrées de table non supportée : ${schemaVersion}.`);
  }
  const parsed: unknown = JSON.parse(value);
  if (!Array.isArray(parsed)) throw new Error('Les entrées de la table aléatoire sont invalides.');
  const entries: RandomTableEntryInput[] = parsed.map((entry) => {
    if (!isEntry(entry)) throw new Error('Une entrée de la table aléatoire est invalide.');
    return entry;
  });
  return normalizeRandomTableEntries(entries);
}

function isEntry(value: unknown): value is RandomTableEntryInput & { id: string } {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry['id'] === 'string' &&
    (entry['minimum'] === null || typeof entry['minimum'] === 'number') &&
    (entry['maximum'] === null || typeof entry['maximum'] === 'number') &&
    typeof entry['resultText'] === 'string'
  );
}
