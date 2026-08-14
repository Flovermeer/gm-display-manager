/**
 * But
 * Définit le port de stockage des illustrations d’objets.
 *
 * Responsabilités
 * - masque le filesystem aux couches supérieures ;
 */

export abstract class ItemImageGateway {
  abstract chooseAndImport(campaignId: string): Promise<string | null>;
  abstract resolveUrl(relativePath: string): Promise<string>;
  abstract discard(relativePath: string): Promise<void>;
}
