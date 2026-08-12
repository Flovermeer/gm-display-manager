import type { Npc } from './npc';

export abstract class NpcRepository {
  abstract listByCampaign(campaignId: string): Promise<readonly Npc[]>;
  abstract findById(campaignId: string, id: string): Promise<Npc | null>;
  abstract save(npc: Npc): Promise<void>;
  abstract delete(campaignId: string, id: string): Promise<void>;
}
