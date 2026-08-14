/**
 * But
 * Définit le port de persistance des entrées de journal.
 *
 * Responsabilités
 * - sépare les requêtes globales des requêtes par ressource ;
 * - ne dépend pas du format SQLite ;
 */

import type { JournalEntry, JournalTarget } from '@app/features/journal/domain/journal-entry';

export abstract class JournalEntryRepository {
  abstract listByCampaign(campaignId: string): Promise<readonly JournalEntry[]>;
  abstract listGlobalByCampaign(campaignId: string): Promise<readonly JournalEntry[]>;
  abstract listByTarget(
    campaignId: string,
    target: JournalTarget,
  ): Promise<readonly JournalEntry[]>;
  abstract findById(campaignId: string, id: string): Promise<JournalEntry | null>;
  abstract save(entry: JournalEntry): Promise<void>;
  abstract delete(campaignId: string, id: string): Promise<void>;
}
