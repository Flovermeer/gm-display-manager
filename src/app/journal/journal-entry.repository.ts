import type { JournalEntry, JournalTarget } from './journal-entry';

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
