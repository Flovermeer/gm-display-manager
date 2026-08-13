import { convertFileSrc } from '@tauri-apps/api/core';
import { appDataDir, join } from '@tauri-apps/api/path';
import { open } from '@tauri-apps/plugin-dialog';
import { BaseDirectory, copyFile, mkdir, remove } from '@tauri-apps/plugin-fs';

import { ItemImageGateway } from './item-image.gateway';

const SUPPORTED_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp'] as const;

export class TauriItemImageGateway extends ItemImageGateway {
  override async chooseAndImport(campaignId: string): Promise<string | null> {
    if (!/^[a-zA-Z0-9-]+$/.test(campaignId)) throw new Error('Invalid campaign identifier.');
    const selectedPath = await open({
      multiple: false,
      directory: false,
      filters: [{ name: 'Images', extensions: [...SUPPORTED_EXTENSIONS] }],
    });
    if (!selectedPath) return null;
    const extension = fileExtension(selectedPath);
    const directory = `campaigns/${campaignId}/media/items`;
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
    segments[0] !== 'campaigns' ||
    segments[2] !== 'media' ||
    segments[3] !== 'items' ||
    segments.some((segment) => !segment || segment === '.' || segment === '..')
  )
    throw new Error('Invalid internal item image path.');
}
