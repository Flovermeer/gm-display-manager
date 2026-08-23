/**
 * But
 * Contrôler les références média SQLite et leurs fichiers via Tauri.
 *
 * Responsabilités
 * - projeter les médias canoniques et les personnalisations de campagne ;
 * - vérifier les fichiers sans charger leur contenu ;
 * - remplacer un fichier à chemin interne inchangé.
 */

import { Injectable } from '@angular/core';
import { appDataDir, join } from '@tauri-apps/api/path';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { open } from '@tauri-apps/plugin-dialog';
import { BaseDirectory, copyFile, exists, mkdir, stat } from '@tauri-apps/plugin-fs';
import Database from '@tauri-apps/plugin-sql';

import {
  MediaDiagnosticGateway,
  type MediaFileStatus,
} from '@app/features/diagnostics/data-access/media-diagnostic.gateway';
import type { MediaKind, MediaReference } from '@app/features/diagnostics/domain/diagnostic.models';

const DATABASE_URL = 'sqlite:beholders-inn.db';

type MediaReferenceRow = Readonly<{
  kind: MediaKind;
  resource_id: string;
  resource_name: string;
  relative_path: string;
}>;

@Injectable()
export class TauriMediaDiagnosticGateway extends MediaDiagnosticGateway {
  override readonly isAvailable = true;
  override readonly isPrimaryWindow = getCurrentWindow().label === 'main';
  private databasePromise?: Promise<Database>;

  override async listReferences(): Promise<readonly MediaReference[]> {
    const rows = await (await this.database()).select<MediaReferenceRow[]>(MEDIA_REFERENCES_QUERY);
    const references = rows.map((row) => ({
      kind: row.kind,
      resourceId: row.resource_id,
      resourceName: row.resource_name,
      relativePath: row.relative_path,
    }));
    return [
      ...new Map(references.map((reference) => [referenceKey(reference), reference])).values(),
    ];
  }

  override async inspectFile(reference: MediaReference): Promise<MediaFileStatus> {
    const options = { baseDir: BaseDirectory.AppData } as const;
    try {
      assertInternalMediaPath(reference);
      if (!(await exists(reference.relativePath, options))) return 'missing';
      const metadata = await stat(reference.relativePath, options);
      return metadata.isFile ? 'healthy' : 'inaccessible';
    } catch {
      return 'inaccessible';
    }
  }

  override async replaceFile(reference: MediaReference): Promise<boolean> {
    assertInternalMediaPath(reference);
    const extension = fileExtension(reference.relativePath);
    const selectedPath = await open({
      multiple: false,
      directory: false,
      filters: [{ name: 'Même format que le fichier d’origine', extensions: [extension] }],
    });
    if (!selectedPath) return false;
    if (fileExtension(selectedPath) !== extension) {
      throw new Error(`Choisis un fichier au format .${extension}.`);
    }

    const segments = reference.relativePath.split('/');
    await mkdir(segments.slice(0, -1).join('/'), {
      baseDir: BaseDirectory.AppData,
      recursive: true,
    });
    await copyFile(selectedPath, await join(await appDataDir(), ...segments));
    return true;
  }

  private database(): Promise<Database> {
    return (this.databasePromise ??= Database.load(DATABASE_URL));
  }
}

const MEDIA_REFERENCES_QUERY = `
  SELECT 'npc-portrait' AS kind, id AS resource_id, name AS resource_name,
         portrait_path AS relative_path
  FROM npc WHERE portrait_path IS NOT NULL AND trim(portrait_path) <> ''
  UNION ALL
  SELECT 'npc-idle-video', id, name, idle_video_path
  FROM npc WHERE idle_video_path IS NOT NULL AND trim(idle_video_path) <> ''
  UNION ALL
  SELECT 'player-character-portrait', id, name, portrait_path
  FROM player_character WHERE portrait_path IS NOT NULL AND trim(portrait_path) <> ''
  UNION ALL
  SELECT 'location-image', id, name, image_path
  FROM location WHERE image_path IS NOT NULL AND trim(image_path) <> ''
  UNION ALL
  SELECT 'item-image', id, name, image_path
  FROM narrative_item WHERE image_path IS NOT NULL AND trim(image_path) <> ''
  UNION ALL
  SELECT 'monster-image', id, name, image_path
  FROM monster WHERE image_path IS NOT NULL AND trim(image_path) <> ''
  UNION ALL
  SELECT 'npc-portrait', resource_id,
         coalesce(json_extract(snapshot_json, '$.name'), resource_id),
         json_extract(snapshot_json, '$.portraitPath')
  FROM campaign_resource_override
  WHERE resource_type = 'npc'
    AND json_extract(snapshot_json, '$.portraitPath') IS NOT NULL
    AND trim(json_extract(snapshot_json, '$.portraitPath')) <> ''
  UNION ALL
  SELECT 'npc-idle-video', resource_id,
         coalesce(json_extract(snapshot_json, '$.name'), resource_id),
         json_extract(snapshot_json, '$.idleVideoPath')
  FROM campaign_resource_override
  WHERE resource_type = 'npc'
    AND json_extract(snapshot_json, '$.idleVideoPath') IS NOT NULL
    AND trim(json_extract(snapshot_json, '$.idleVideoPath')) <> ''
  UNION ALL
  SELECT 'player-character-portrait', resource_id,
         coalesce(json_extract(snapshot_json, '$.name'), resource_id),
         json_extract(snapshot_json, '$.portraitPath')
  FROM campaign_resource_override
  WHERE resource_type = 'player_character'
    AND json_extract(snapshot_json, '$.portraitPath') IS NOT NULL
    AND trim(json_extract(snapshot_json, '$.portraitPath')) <> ''
  UNION ALL
  SELECT CASE resource_type
           WHEN 'location' THEN 'location-image'
           WHEN 'narrative_item' THEN 'item-image'
           WHEN 'monster' THEN 'monster-image'
         END,
         resource_id, coalesce(json_extract(snapshot_json, '$.name'), resource_id),
         json_extract(snapshot_json, '$.imagePath')
  FROM campaign_resource_override
  WHERE resource_type IN ('location', 'narrative_item', 'monster')
    AND json_extract(snapshot_json, '$.imagePath') IS NOT NULL
    AND trim(json_extract(snapshot_json, '$.imagePath')) <> ''
  ORDER BY resource_name COLLATE NOCASE, kind, relative_path`;

const MEDIA_DIRECTORIES: Readonly<Record<MediaKind, string>> = {
  'npc-portrait': 'npc-portraits',
  'npc-idle-video': 'npc-idle-videos',
  'player-character-portrait': 'player-character-portraits',
  'location-image': 'locations',
  'item-image': 'items',
  'monster-image': 'monsters',
};

function assertInternalMediaPath(reference: MediaReference): void {
  const segments = reference.relativePath.split('/');
  if (
    segments.length !== 5 ||
    !['campaigns', 'universes'].includes(segments[0]) ||
    segments[2] !== 'media' ||
    segments[3] !== MEDIA_DIRECTORIES[reference.kind] ||
    segments.some((segment) => !segment || segment === '.' || segment === '..')
  ) {
    throw new Error('Chemin média interne invalide.');
  }
}

function fileExtension(path: string): string {
  const extension = path.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase();
  if (!extension) throw new Error('Le format du média référencé est invalide.');
  return extension;
}

function referenceKey(reference: MediaReference): string {
  return `${reference.kind}\0${reference.resourceId}\0${reference.relativePath}`;
}
