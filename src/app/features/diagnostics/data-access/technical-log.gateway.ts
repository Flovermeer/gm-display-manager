/**
 * But
 * Définir le port du journal technique local.
 *
 * Responsabilités
 * - écrire des événements sans exposer le plugin Tauri à l'application ;
 * - ouvrir le dossier natif des journaux à la demande du MJ.
 */

export abstract class TechnicalLogGateway {
  abstract readonly isAvailable: boolean;

  abstract info(message: string): Promise<void>;
  abstract warning(message: string): Promise<void>;
  abstract error(message: string): Promise<void>;
  abstract openDirectory(): Promise<void>;
}
