/**
 * But
 * Importe et résout les illustrations du bestiaire via Tauri.
 *
 * Responsabilités
 * - stocke les images dans les médias de l’univers ;
 * - accepte aussi les anciens chemins de campagne lors de la lecture.
 */

import { convertFileSrc } from '@tauri-apps/api/core';
import { appDataDir, join } from '@tauri-apps/api/path';
import { open } from '@tauri-apps/plugin-dialog';
import { BaseDirectory, copyFile, mkdir, remove } from '@tauri-apps/plugin-fs';

import { MonsterImageGateway } from '@app/features/bestiary/data-access/monster-image.gateway';

const SUPPORTED_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp'] as const;

export class TauriMonsterImageGateway extends MonsterImageGateway {
  override async chooseAndImport(universeId: string): Promise<string | null> {
    assertSafeSegment(universeId);
    const selectedPath = await open({
      multiple: false,
      directory: false,
      filters: [{ name: 'Images', extensions: [...SUPPORTED_EXTENSIONS] }],
    });
    if (!selectedPath) return null;
    const extension = fileExtension(selectedPath);
    const directory = `universes/${universeId}/media/monsters`;
    const relativePath = `${directory}/${crypto.randomUUID()}.${extension}`;
    try {
      await mkdir(directory, { baseDir: BaseDirectory.AppData, recursive: true });
      await copyFile(selectedPath, await this.absolutePath(relativePath));
    } catch (error) {
      throw new Error(`Impossible de copier l’illustration : ${nativeErrorMessage(error)}`);
    }
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

function fileExtension(path: string): string {
  const extension = path.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase();
  if (
    !extension ||
    !SUPPORTED_EXTENSIONS.includes(extension as (typeof SUPPORTED_EXTENSIONS)[number])
  ) {
    throw new Error('Choisis une image PNG, JPG, JPEG ou WebP.');
  }
  return extension;
}

function assertInternalPath(path: string): void {
  const segments = path.split('/');
  if (
    segments.length !== 5 ||
    !['campaigns', 'universes'].includes(segments[0]) ||
    segments[2] !== 'media' ||
    segments[3] !== 'monsters' ||
    segments.some((segment) => !segment || segment === '.' || segment === '..')
  ) {
    throw new Error('Invalid internal monster image path.');
  }
}

function assertSafeSegment(value: string): void {
  if (!/^[a-zA-Z0-9-]+$/.test(value)) throw new Error('Invalid universe identifier.');
}

function nativeErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return String(error);
}
