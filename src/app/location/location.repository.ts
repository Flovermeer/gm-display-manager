import type { Location } from './location';

export abstract class LocationRepository {
  abstract listByCampaign(campaignId: string): Promise<readonly Location[]>;
  abstract findById(campaignId: string, id: string): Promise<Location | null>;
  abstract save(location: Location): Promise<void>;
  abstract delete(campaignId: string, id: string): Promise<void>;
}
