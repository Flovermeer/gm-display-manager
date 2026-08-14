/**
 * But
 * Définit le port de stockage des animations de PNJ.
 *
 * Responsabilités
 * - sépare la gestion vidéo du composant et du domaine ;
 */

export abstract class NpcIdleVideoGateway {
  abstract chooseAndImport(campaignId: string): Promise<string | null>;
  abstract resolveUrl(relativePath: string): Promise<string>;
  abstract discard(relativePath: string): Promise<void>;
}
