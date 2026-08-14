/**
 * But
 * Simule les portraits de PNJ dans le navigateur.
 *
 * Responsabilités
 * - permet la prévisualisation sans accès natif ;
 */

import { NpcPortraitGateway } from '@app/features/npcs/data-access/npc-portrait.gateway';

export class BrowserNpcPortraitGateway extends NpcPortraitGateway {
  override chooseAndImport(): Promise<string | null> {
    return Promise.reject(
      new Error("L'import de portraits est disponible dans l'application Tauri."),
    );
  }

  override resolveUrl(relativePath: string): Promise<string> {
    return Promise.resolve(relativePath);
  }

  override discard(): Promise<void> {
    return Promise.resolve();
  }
}
