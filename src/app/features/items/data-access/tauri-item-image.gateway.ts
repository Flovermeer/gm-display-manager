/**
 * But
 * Importe et résout les illustrations d’objets via Tauri.
 *
 * Responsabilités
 * - copie les images dans les médias de campagne ;
 * - fournit une URL compatible avec la webview ;
 */

import { convertFileSrc } from '@tauri-apps/api/core';
import { appDataDir, join } from '@tauri-apps/api/path';
import { open } from '@tauri-apps/plugin-dialog';
import { BaseDirectory, copyFile, mkdir, remove } from '@tauri-apps/plugin-fs';

import { ItemImageGateway } from '@app/features/items/data-access/item-image.gateway';

const SUPPORTED_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp'] as const;

export class TauriItemImageGateway extends ItemImageGateway {
  override async chooseAndImport(universeId: string): Promise<string | null> {
    if (!/^[a-zA-Z0-9-]+$/.test(universeId)) throw new Error('Invalid universe identifier.');
    const selectedPath = await open({
      multiple: false,
      directory: false,
      filters: [{ name: 'Images', extensions: [...SUPPORTED_EXTENSIONS] }],
    });
    if (!selectedPath) return null;
    const extension = fileExtension(selectedPath);
    const directory = `universes/${universeId}/media/items`;
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

function fileExtension(path: string): string {
  const extension = path.match(/\.([a-z0-9]+)$/i)?.[1]?.toLocaleLowerCase('en');
  if (!extension || !SUPPORTED_EXTENSIONS.some((supported) => supported === extension))
    throw new Error('Choisis une image PNG, JPG, JPEG ou WebP.');
  return extension;
}

function assertInternalPath(path: string): void {
  const segments = path.split('/');
  if (
    segments.length !== 5 ||
    !['campaigns', 'universes'].includes(segments[0]) ||
    segments[2] !== 'media' ||
    segments[3] !== 'items' ||
    segments.some((segment) => !segment || segment === '.' || segment === '..')
  )
    throw new Error('Invalid internal item image path.');
}
