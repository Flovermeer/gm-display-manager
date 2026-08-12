import { Injectable } from '@angular/core';
import Database from '@tauri-apps/plugin-sql';

import { AppSettingRepository } from './app-setting.repository';

const DATABASE_URL = 'sqlite:beholders-inn.db';

type AppSettingRow = Readonly<{ value: string }>;

@Injectable()
export class TauriAppSettingRepository extends AppSettingRepository {
  private databasePromise?: Promise<Database>;

  override async get(key: string): Promise<string | null> {
    const database = await this.getDatabase();
    const rows = await database.select<AppSettingRow[]>(
      'SELECT value FROM app_setting WHERE key = $1',
      [key],
    );

    return rows[0]?.value ?? null;
  }

  override async set(key: string, value: string): Promise<void> {
    const database = await this.getDatabase();
    await database.execute(
      `INSERT INTO app_setting (key, value)
       VALUES ($1, $2)
       ON CONFLICT(key) DO UPDATE SET
         value = excluded.value,
         updated_at = CURRENT_TIMESTAMP`,
      [key, value],
    );
  }

  override async delete(key: string): Promise<void> {
    const database = await this.getDatabase();
    await database.execute('DELETE FROM app_setting WHERE key = $1', [key]);
  }

  private getDatabase(): Promise<Database> {
    this.databasePromise ??= Database.load(DATABASE_URL).catch((error: unknown) => {
      this.databasePromise = undefined;
      throw error;
    });

    return this.databasePromise;
  }
}
