/**
 * But
 * Fournit une doublure navigateur pour les illustrations du bestiaire.
 *
 * Responsabilités
 * - laisse le workspace fonctionner hors de Tauri ;
 * - ne réalise aucune mutation du filesystem.
 */

import { MonsterImageGateway } from '@app/features/bestiary/data-access/monster-image.gateway';

export class BrowserMonsterImageGateway extends MonsterImageGateway {
  override chooseAndImport(): Promise<string | null> {
    return Promise.resolve(null);
  }

  override resolveUrl(relativePath: string): Promise<string> {
    return Promise.resolve(relativePath);
  }

  override discard(): Promise<void> {
    return Promise.resolve();
  }
}
