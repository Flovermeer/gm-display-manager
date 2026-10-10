/**
 * But
 * Simule les images de lieu dans le navigateur.
 *
 * Responsabilités
 * - produit des URLs utilisables sans filesystem Tauri ;
 * - facilite le développement et les tests hors desktop ;
 */

import { LocationImageGateway } from '@app/features/locations/data-access/location-image.gateway';

export class BrowserLocationImageGateway extends LocationImageGateway {
  override chooseAndImport(): Promise<readonly string[]> {
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
