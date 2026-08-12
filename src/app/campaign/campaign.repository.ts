import type { Campaign } from './campaign';

export abstract class CampaignRepository {
  abstract list(): Promise<readonly Campaign[]>;
  abstract findById(id: string): Promise<Campaign | null>;
  abstract save(campaign: Campaign): Promise<void>;
  abstract delete(id: string): Promise<void>;
}
