import { Injectable } from '@angular/core';
import Database from '@tauri-apps/plugin-sql';

import type { Chapter } from '../chapter/chapter';
import { ChapterRepository, type ChapterOrder } from '../chapter/chapter.repository';
import type { RichTextDocument } from '../shared/rich-text-editor/rich-text-document';

const DATABASE_URL = 'sqlite:beholders-inn.db';

type ChapterRow = Readonly<{
  id: string;
  campaign_id: string;
  title: string;
  summary: string;
  content_json: string;
  content_schema_version: number;
  position: number;
  created_at: string;
  updated_at: string;
}>;

@Injectable()
export class TauriChapterRepository extends ChapterRepository {
  private databasePromise?: Promise<Database>;

  override async listByCampaign(campaignId: string): Promise<readonly Chapter[]> {
    const database = await this.getDatabase();
    const rows = await database.select<ChapterRow[]>(
      `${CHAPTER_COLUMNS}
       FROM chapter
       WHERE campaign_id = $1
       ORDER BY position, title COLLATE NOCASE, id`,
      [campaignId],
    );
    return rows.map(mapChapterRow);
  }

  override async findById(campaignId: string, id: string): Promise<Chapter | null> {
    const database = await this.getDatabase();
    const rows = await database.select<ChapterRow[]>(
      `${CHAPTER_COLUMNS}
       FROM chapter
       WHERE campaign_id = $1 AND id = $2`,
      [campaignId, id],
    );
    return rows[0] ? mapChapterRow(rows[0]) : null;
  }

  override async save(chapter: Chapter): Promise<void> {
    const database = await this.getDatabase();
    await database.execute(
      `INSERT INTO chapter (
         id, campaign_id, title, summary, content_json, content_schema_version,
         position, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT(id) DO UPDATE SET
         title = excluded.title,
         summary = excluded.summary,
         content_json = excluded.content_json,
         content_schema_version = excluded.content_schema_version,
         position = excluded.position,
         updated_at = excluded.updated_at
       WHERE chapter.campaign_id = excluded.campaign_id`,
      [
        chapter.id,
        chapter.campaignId,
        chapter.title,
        chapter.summary,
        JSON.stringify(chapter.content.content),
        chapter.content.schemaVersion,
        chapter.position,
        chapter.createdAt,
        chapter.updatedAt,
      ],
    );
  }

  override async updateOrder(chapters: readonly ChapterOrder[]): Promise<void> {
    if (chapters.length !== 2) throw new Error('Exactly two chapters are required to swap order.');
    const [first, second] = chapters;
    if (!first || !second || first.campaignId !== second.campaignId) {
      throw new Error('Chapters must belong to the same campaign.');
    }

    const database = await this.getDatabase();
    await database.execute(
      `UPDATE chapter
       SET position = CASE id
         WHEN $2 THEN $3
         WHEN $4 THEN $5
       END,
       updated_at = $6
       WHERE campaign_id = $1 AND id IN ($2, $4)`,
      [first.campaignId, first.id, first.position, second.id, second.position, first.updatedAt],
    );
  }

  override async delete(campaignId: string, id: string): Promise<void> {
    const database = await this.getDatabase();
    await database.execute('DELETE FROM chapter WHERE campaign_id = $1 AND id = $2', [
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

const CHAPTER_COLUMNS = `SELECT id, campaign_id, title, summary, content_json,
                                content_schema_version, position, created_at, updated_at`;

function mapChapterRow(row: ChapterRow): Chapter {
  const content = parseContent(row.content_json, row.content_schema_version);
  return {
    id: row.id,
    campaignId: row.campaign_id,
    title: row.title,
    summary: row.summary,
    content,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parseContent(value: string, schemaVersion: number): RichTextDocument {
  const content: unknown = JSON.parse(value);
  if (typeof content !== 'object' || content === null || Array.isArray(content)) {
    throw new Error('Invalid chapter content data.');
  }
  if (schemaVersion !== 1) throw new Error(`Unsupported chapter content schema: ${schemaVersion}.`);
  return { schemaVersion, content } as RichTextDocument;
}
