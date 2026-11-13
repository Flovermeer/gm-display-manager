/**
 * But
 * Importe et résout les portraits de PNJ via Tauri.
 *
 * Responsabilités
 * - copie les images dans le dossier de campagne ;
 * - expose une URL compatible avec la webview ;
 */

import { convertFileSrc } from '@tauri-apps/api/core';
import { appDataDir, join } from '@tauri-apps/api/path';
import { open } from '@tauri-apps/plugin-dialog';
import { BaseDirectory, copyFile, mkdir, remove } from '@tauri-apps/plugin-fs';

import { NpcPortraitGateway } from '@app/features/npcs/data-access/npc-portrait.gateway';

const SUPPORTED_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp'] as const;
const PORTRAIT_ROOT = 'universes';

export class TauriNpcPortraitGateway extends NpcPortraitGateway {
  override async chooseAndImport(universeId: string): Promise<string | null> {
    assertSafePathSegment(universeId);
    const selectedPath = await open({
      multiple: false,
      directory: false,
      filters: [{ name: 'Images', extensions: [...SUPPORTED_EXTENSIONS] }],
    });

    if (!selectedPath) {
      return null;
    }

    const extension = fileExtension(selectedPath);
    const relativeDirectory = `${PORTRAIT_ROOT}/${universeId}/media/npc-portraits`;
    const relativePath = `${relativeDirectory}/${crypto.randomUUID()}.${extension}`;
    const destinationPath = await this.absolutePath(relativePath);

    try {
      await mkdir(relativeDirectory, { baseDir: BaseDirectory.AppData, recursive: true });
      await copyFile(selectedPath, destinationPath);
    } catch (error) {
      throw new Error(`Impossible de copier le portrait : ${nativeErrorMessage(error)}`, {
        cause: error,
      });
    }
    return relativePath;
  }

  override async resolveUrl(relativePath: string): Promise<string> {
    assertInternalPortraitPath(relativePath);
    return convertFileSrc(await this.absolutePath(relativePath));
  }

  override async discard(relativePath: string): Promise<void> {
    assertInternalPortraitPath(relativePath);
    await remove(await this.absolutePath(relativePath));
  }

  private async absolutePath(relativePath: string): Promise<string> {
    return join(await appDataDir(), ...relativePath.split('/'));
  }
}

function nativeErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return String(error);
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

function assertInternalPortraitPath(relativePath: string): void {
  const segments = relativePath.split('/');
  if (
    segments.length !== 5 ||
    !['campaigns', PORTRAIT_ROOT].includes(segments[0]) ||
    segments[2] !== 'media' ||
    segments[3] !== 'npc-portraits' ||
    segments.some((segment) => !segment || segment === '.' || segment === '..')
  ) {
    throw new Error('Invalid internal NPC portrait path.');
  }
}

function assertSafePathSegment(value: string): void {
  if (!/^[a-zA-Z0-9-]+$/.test(value)) {
    throw new Error('Invalid universe identifier.');
  }
}
