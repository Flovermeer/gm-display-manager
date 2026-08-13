import { inject, Injectable } from '@angular/core';

import {
  createJournalEntry,
  updateJournalEntry,
  type JournalEntry,
  type JournalTarget,
  type UpdateJournalEntryInput,
} from '@app/journal/journal-entry';
import { JournalEntryRepository } from '@app/journal/journal-entry.repository';

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
