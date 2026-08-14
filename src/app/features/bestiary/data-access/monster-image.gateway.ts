/**
 * But
 * Définit le port d’import et de résolution des illustrations du bestiaire.
 *
 * Responsabilités
 * - isole le filesystem natif du workspace Angular ;
 * - conserve des chemins relatifs dans le domaine.
 */

export abstract class MonsterImageGateway {
  abstract chooseAndImport(universeId: string): Promise<string | null>;
  abstract resolveUrl(relativePath: string): Promise<string>;
  abstract discard(relativePath: string): Promise<void>;
}
