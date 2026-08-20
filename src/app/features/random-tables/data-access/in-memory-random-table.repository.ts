/**
 * But
 * Conserve les tables aléatoires en mémoire hors de Tauri.
 *
 * Responsabilités
 * - sert d'adaptateur navigateur et de doublure de test ;
 * - reproduit l'isolation des tables par campagne.
 */

import { RandomTableRepository } from '@app/features/random-tables/data-access/random-table.repository';
import type { RandomTable } from '@app/features/random-tables/domain/random-table';

export class InMemoryRandomTableRepository extends RandomTableRepository {
  private readonly tables = new Map<string, RandomTable>();

  override listByCampaign(campaignId: string): Promise<readonly RandomTable[]> {
    return Promise.resolve(
      [...this.tables.values()]
        .filter((table) => table.campaignId === campaignId)
        .sort(
          (left, right) =>
            left.name.localeCompare(right.name, 'fr') || left.id.localeCompare(right.id),
        ),
    );
  }

  override findById(campaignId: string, id: string): Promise<RandomTable | null> {
    const table = this.tables.get(id);
    return Promise.resolve(table?.campaignId === campaignId ? table : null);
  }

  override save(table: RandomTable): Promise<void> {
    const existing = this.tables.get(table.id);
    if (existing && existing.campaignId !== table.campaignId) {
      return Promise.reject(new Error("La table n'appartient pas à cette campagne."));
    }
    this.tables.set(table.id, table);
    return Promise.resolve();
  }

  override delete(campaignId: string, id: string): Promise<void> {
    if (this.tables.get(id)?.campaignId === campaignId) this.tables.delete(id);
    return Promise.resolve();
  }
}
