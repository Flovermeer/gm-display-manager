import { convertFileSrc } from '@tauri-apps/api/core';
import { appDataDir, join } from '@tauri-apps/api/path';
import { open } from '@tauri-apps/plugin-dialog';
import { BaseDirectory, copyFile, mkdir, remove } from '@tauri-apps/plugin-fs';

import { LocationImageGateway } from './location-image.gateway';

const SUPPORTED_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp'] as const;
const MEDIA_ROOT = 'campaigns';

export class TauriLocationImageGateway extends LocationImageGateway {
  override async chooseAndImport(campaignId: string): Promise<string | null> {
    assertSafePathSegment(campaignId);
    const selectedPath = await open({
      multiple: false,
      directory: false,
      filters: [{ name: 'Images', extensions: [...SUPPORTED_EXTENSIONS] }],
    });

    if (!selectedPath) {
      return null;
    }

    const extension = fileExtension(selectedPath);
    const relativeDirectory = `${MEDIA_ROOT}/${campaignId}/media/locations`;
    const relativePath = `${relativeDirectory}/${crypto.randomUUID()}.${extension}`;
    const destinationPath = await this.absolutePath(relativePath);

    await mkdir(relativeDirectory, { baseDir: BaseDirectory.AppData, recursive: true });
    await copyFile(selectedPath, destinationPath);
    return relativePath;
  }

  override async resolveUrl(relativePath: string): Promise<string> {
    assertInternalImagePath(relativePath);
    return convertFileSrc(await this.absolutePath(relativePath));
  }

  override async discard(relativePath: string): Promise<void> {
    assertInternalImagePath(relativePath);
    await remove(await this.absolutePath(relativePath));
  }

  private async absolutePath(relativePath: string): Promise<string> {
    return join(await appDataDir(), ...relativePath.split('/'));
  }
}

function fileExtension(path: string): string {
  const extension = path.match(/\.([a-z0-9]+)$/i)?.[1]?.toLocaleLowerCase('en');
  if (
    !extension ||
    !SUPPORTED_EXTENSIONS.includes(extension as (typeof SUPPORTED_EXTENSIONS)[number])
  ) {
    throw new Error('Choisis une image PNG, JPG, JPEG ou WebP.');
  }

  return extension;
}

function assertInternalImagePath(relativePath: string): void {
  const segments = relativePath.split('/');
  if (
    segments.length !== 5 ||
    segments[0] !== MEDIA_ROOT ||
    segments[2] !== 'media' ||
    segments[3] !== 'locations' ||
    segments.some((segment) => !segment || segment === '.' || segment === '..')
  ) {
    throw new Error('Invalid internal location image path.');
  }
}

function assertSafePathSegment(value: string): void {
  if (!/^[a-zA-Z0-9-]+$/.test(value)) {
    throw new Error('Invalid campaign identifier.');
  }
}
