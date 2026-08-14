/**
 * But
 * Importe et résout les animations de PNJ via Tauri.
 *
 * Responsabilités
 * - stocke les vidéos dans les médias de campagne ;
 * - expose une URL compatible avec le Player Display ;
 */

import { convertFileSrc } from '@tauri-apps/api/core';
import { appDataDir, join } from '@tauri-apps/api/path';
import { open } from '@tauri-apps/plugin-dialog';
import { BaseDirectory, copyFile, mkdir, remove } from '@tauri-apps/plugin-fs';

import { NpcIdleVideoGateway } from '@app/features/npcs/data-access/npc-idle-video.gateway';

const SUPPORTED_EXTENSIONS = ['webm', 'mp4'] as const;

export class TauriNpcIdleVideoGateway extends NpcIdleVideoGateway {
  override async chooseAndImport(universeId: string): Promise<string | null> {
    assertSafeSegment(universeId);
    const selectedPath = await open({
      multiple: false,
      directory: false,
      filters: [{ name: 'Vidéos', extensions: [...SUPPORTED_EXTENSIONS] }],
    });
    if (!selectedPath) return null;

    const extension = selectedPath.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase();
    if (!extension || !SUPPORTED_EXTENSIONS.includes(extension as 'webm' | 'mp4')) {
      throw new Error('Choisis une vidéo WebM ou MP4.');
    }
    const directory = `universes/${universeId}/media/npc-idle-videos`;
    const relativePath = `${directory}/${crypto.randomUUID()}.${extension}`;
    await mkdir(directory, { baseDir: BaseDirectory.AppData, recursive: true });
    await copyFile(selectedPath, await this.absolutePath(relativePath));
    return relativePath;
  }

  override async resolveUrl(relativePath: string): Promise<string> {
    assertInternalPath(relativePath);
    return convertFileSrc(await this.absolutePath(relativePath));
  }

  override async discard(relativePath: string): Promise<void> {
    assertInternalPath(relativePath);
    await remove(await this.absolutePath(relativePath));
  }

  private async absolutePath(relativePath: string): Promise<string> {
    return join(await appDataDir(), ...relativePath.split('/'));
  }
}

function assertInternalPath(path: string): void {
  const segments = path.split('/');
  if (
    segments.length !== 5 ||
    !['campaigns', 'universes'].includes(segments[0]) ||
    segments[2] !== 'media' ||
    segments[3] !== 'npc-idle-videos' ||
    segments.some((segment) => !segment || segment === '.' || segment === '..')
  ) {
    throw new Error('Invalid internal NPC idle video path.');
  }
}

function assertSafeSegment(value: string): void {
  if (!/^[a-zA-Z0-9-]+$/.test(value)) throw new Error('Invalid universe identifier.');
}
