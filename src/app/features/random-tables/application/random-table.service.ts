/**
 * But
 * Orchestre le CRUD et les tirages des tables aléatoires d'une campagne.
 *
 * Responsabilités
 * - construit et sauvegarde les agrégats complets ;
 * - applique les règles de couverture avant chaque tirage.
 */

import { inject, Injectable } from '@angular/core';

import { RandomTableRepository } from '@app/features/random-tables/data-access/random-table.repository';
import {
  createRandomTable,
  rollRandomTable,
  updateRandomTable,
  type RandomTable,
  type RandomTableInput,
  type RandomTableRoll,
} from '@app/features/random-tables/domain/random-table';

@Injectable({ providedIn: 'root' })
export class RandomTableService {
  private readonly repository = inject(RandomTableRepository);

  list(campaignId: string): Promise<readonly RandomTable[]> {
    return this.repository.listByCampaign(campaignId);
  }

  async create(campaignId: string, input: RandomTableInput): Promise<RandomTable> {
    const table = createRandomTable(campaignId, input);
    await this.repository.save(table);
    return table;
  }

  async update(table: RandomTable, input: RandomTableInput): Promise<RandomTable> {
    const updated = updateRandomTable(table, input);
    await this.repository.save(updated);
    return updated;
  }

  delete(table: RandomTable): Promise<void> {
    return this.repository.delete(table.campaignId, table.id);
  }

  roll(table: RandomTable): RandomTableRoll {
    return rollRandomTable(table);
  }
}
