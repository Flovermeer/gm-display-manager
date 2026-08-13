import type { NarrativeItem } from '@app/narrative-item/narrative-item';

export abstract class NarrativeItemRepository {
  abstract listByCampaign(campaignId: string): Promise<readonly NarrativeItem[]>;
  abstract findById(campaignId: string, id: string): Promise<NarrativeItem | null>;
  abstract save(item: NarrativeItem): Promise<void>;
  abstract delete(campaignId: string, id: string): Promise<void>;
  abstract countUsingConfiguration(
    campaignId: string,
    kind: 'type' | 'rarity',
    id: string,
  ): Promise<number>;
}
