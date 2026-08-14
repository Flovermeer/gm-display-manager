/**
 * But
 * Orchestre les notes journalisées d’une campagne.
 *
 * Responsabilités
 * - crée et modifie les entrées horodatées ;
 * - coordonne les requêtes globales et ciblées via le repository ;
 */

import { inject, Injectable } from '@angular/core';

import {
  createJournalEntry,
  updateJournalEntry,
  type JournalEntry,
  type JournalTarget,
  type UpdateJournalEntryInput,
} from '@app/features/journal/domain/journal-entry';
import { JournalEntryRepository } from '@app/features/journal/data-access/journal-entry.repository';

@Injectable({ providedIn: 'root' })
export class JournalEntryService {
  private readonly repository = inject(JournalEntryRepository);

  list(campaignId: string): Promise<readonly JournalEntry[]> {
    return this.repository.listByCampaign(campaignId);
  }

  listGlobal(campaignId: string): Promise<readonly JournalEntry[]> {
    return this.repository.listGlobalByCampaign(campaignId);
  }

  listForTarget(campaignId: string, target: JournalTarget): Promise<readonly JournalEntry[]> {
    return this.repository.listByTarget(campaignId, target);
  }

  async create(
    campaignId: string,
    target: JournalTarget | null,
    input: UpdateJournalEntryInput,
  ): Promise<JournalEntry> {
    const entry = createJournalEntry(campaignId, target, input);
    await this.repository.save(entry);
    return entry;
  }

  async update(entry: JournalEntry, input: UpdateJournalEntryInput): Promise<JournalEntry> {
    const updated = updateJournalEntry(entry, input);
    await this.repository.save(updated);
    return updated;
  }

  delete(entry: JournalEntry): Promise<void> {
    return this.repository.delete(entry.campaignId, entry.id);
  }
}
