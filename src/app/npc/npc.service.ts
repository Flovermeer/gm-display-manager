import { inject, Injectable } from '@angular/core';

import { createNpc, updateNpc, type Npc, type UpdateNpcInput } from './npc';
import { NpcRepository } from './npc.repository';

@Injectable({ providedIn: 'root' })
export class NpcService {
  private readonly repository = inject(NpcRepository);

  list(campaignId: string): Promise<readonly Npc[]> {
    return this.repository.listByCampaign(campaignId);
  }

  async create(campaignId: string, input: UpdateNpcInput): Promise<Npc> {
    const npc = createNpc({ campaignId, ...input });
    await this.repository.save(npc);
    return npc;
  }

  async update(npc: Npc, input: UpdateNpcInput): Promise<Npc> {
    const updatedNpc = updateNpc(npc, input);
    await this.repository.save(updatedNpc);
    return updatedNpc;
  }

  delete(npc: Npc): Promise<void> {
    return this.repository.delete(npc.campaignId, npc.id);
  }
}
