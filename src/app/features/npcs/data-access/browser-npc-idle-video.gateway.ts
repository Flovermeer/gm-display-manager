/**
 * But
 * Simule les animations de PNJ dans le navigateur.
 *
 * Responsabilités
 * - permet l’exécution sans filesystem natif ;
 */

import { NpcIdleVideoGateway } from '@app/features/npcs/data-access/npc-idle-video.gateway';

export class BrowserNpcIdleVideoGateway extends NpcIdleVideoGateway {
  override chooseAndImport(): Promise<string | null> {
    return Promise.reject(new Error("L'import vidéo est disponible dans l'application Tauri."));
  }
  override resolveUrl(relativePath: string): Promise<string> {
    return Promise.resolve(relativePath);
  }
  override discard(): Promise<void> {
    return Promise.resolve();
  }
}
