/**
 * But
 * Définit le port de persistance des tables aléatoires d'une campagne.
 *
 * Responsabilités
 * - charge et sauvegarde l'agrégat table avec toutes ses entrées ;
 * - garde SQLite hors de la couche application.
 */

import type { RandomTable } from '@app/features/random-tables/domain/random-table';

export abstract class RandomTableRepository {
  abstract listByCampaign(campaignId: string): Promise<readonly RandomTable[]>;
  abstract findById(campaignId: string, id: string): Promise<RandomTable | null>;
  abstract save(table: RandomTable): Promise<void>;
  abstract delete(campaignId: string, id: string): Promise<void>;
}
