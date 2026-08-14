/**
 * But
 * Définit le port de stockage des portraits statiques de PNJ.
 *
 * Responsabilités
 * - masque le filesystem à l’interface et aux services ;
 */

export abstract class NpcPortraitGateway {
  abstract chooseAndImport(campaignId: string): Promise<string | null>;
  abstract resolveUrl(relativePath: string): Promise<string>;
  abstract discard(relativePath: string): Promise<void>;
}
