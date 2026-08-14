/**
 * But
 * Définit le port de persistance des préférences globales de l’application.
 *
 * Responsabilités
 * - isole le métier du stockage SQLite ;
 * - expose uniquement la lecture, l’écriture et la suppression par clé ;
 */

export abstract class AppSettingRepository {
  abstract get(key: string): Promise<string | null>;
  abstract set(key: string, value: string): Promise<void>;
  abstract delete(key: string): Promise<void>;
}
