/**
 * But
 * Simule les illustrations d’objets dans le navigateur.
 *
 * Responsabilités
 * - permet la prévisualisation sans Tauri ;
 */

import { ItemImageGateway } from '@app/features/items/data-access/item-image.gateway';

export class BrowserItemImageGateway extends ItemImageGateway {
  override chooseAndImport(): Promise<string | null> {
    return Promise.reject(
      new Error("L'import d'illustrations est disponible dans l'application Tauri."),
    );
  }
  override resolveUrl(relativePath: string): Promise<string> {
    return Promise.resolve(relativePath);
  }
  override discard(): Promise<void> {
    return Promise.resolve();
  }
}
