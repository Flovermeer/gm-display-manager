/**
 * But
 * Conserve les entrées de journal en mémoire hors de Tauri.
 *
 * Responsabilités
 * - reproduit les filtres et l’ordre chronologique attendus ;
 * - sert au navigateur et aux tests ;
 */

import type { JournalEntry, JournalTarget } from '@app/features/journal/domain/journal-entry';
import { JournalEntryRepository } from '@app/features/journal/data-access/journal-entry.repository';

export class InMemoryJournalEntryRepository extends JournalEntryRepository {
  private readonly entries = new Map<string, JournalEntry>();

  override listByCampaign(campaignId: string): Promise<readonly JournalEntry[]> {
    return Promise.resolve(this.sorted((entry) => entry.campaignId === campaignId));
  }

  override listGlobalByCampaign(campaignId: string): Promise<readonly JournalEntry[]> {
    return Promise.resolve(
      this.sorted((entry) => entry.campaignId === campaignId && entry.target === null),
    );
  }

  override listByTarget(
    campaignId: string,
    target: JournalTarget,
  ): Promise<readonly JournalEntry[]> {
    return Promise.resolve(
      this.sorted(
        (entry) =>
          entry.campaignId === campaignId &&
          entry.target?.resourceType === target.resourceType &&
          entry.target.resourceId === target.resourceId,
      ),
    );
  }

  override findById(campaignId: string, id: string): Promise<JournalEntry | null> {
    const entry = this.entries.get(id);
    return Promise.resolve(entry?.campaignId === campaignId ? entry : null);
  }

  override save(entry: JournalEntry): Promise<void> {
    this.entries.set(entry.id, entry);
    return Promise.resolve();
  }

  override delete(campaignId: string, id: string): Promise<void> {
    const entry = this.entries.get(id);
    if (entry?.campaignId === campaignId) this.entries.delete(id);
    return Promise.resolve();
  }

  private sorted(predicate: (entry: JournalEntry) => boolean): readonly JournalEntry[] {
    return [...this.entries.values()]
      .filter(predicate)
      .sort(
        (left, right) =>
          right.sessionAt.localeCompare(left.sessionAt) ||
          right.createdAt.localeCompare(left.createdAt) ||
          right.id.localeCompare(left.id),
      );
  }
}
