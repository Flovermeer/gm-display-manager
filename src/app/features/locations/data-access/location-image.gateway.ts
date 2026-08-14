/**
 * But
 * Définit le port de stockage et de résolution des images de lieu.
 *
 * Responsabilités
 * - masque le filesystem à la couche application ;
 * - normalise les opérations d’import, lecture et suppression ;
 */

export abstract class LocationImageGateway {
  abstract chooseAndImport(campaignId: string): Promise<string | null>;
  abstract resolveUrl(relativePath: string): Promise<string>;
  abstract discard(relativePath: string): Promise<void>;
}
