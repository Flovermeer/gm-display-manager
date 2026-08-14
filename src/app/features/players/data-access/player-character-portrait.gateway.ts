/**
 * But
 * Définit le port de stockage des portraits de PJ.
 *
 * Responsabilités
 * - masque le filesystem aux pages de la feature ;
 */

export abstract class PlayerCharacterPortraitGateway {
  abstract chooseAndImport(campaignId: string): Promise<string | null>;
  abstract resolveUrl(relativePath: string): Promise<string>;
  abstract discard(relativePath: string): Promise<void>;
}
