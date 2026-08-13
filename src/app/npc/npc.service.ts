import { inject, Injectable } from '@angular/core';

import { createNpc, updateNpc, type Npc, type UpdateNpcInput } from '@app/npc/npc';
import { NpcRepository } from '@app/npc/npc.repository';

@Injectable({ providedIn: 'root' })
export class NpcService {
  private readonly repository = inject(NpcRepository);

  list(campaignId: string): Promise<readonly Npc[]> {
    return this.repository.listByCampaign(campaignId);
  }

  async create(
    campaignId: string,
    input: UpdateNpcInput,
    portraitPath: string | null = null,
    idleVideoPath: string | null = null,
  ): Promise<Npc> {
    const npc = createNpc({ campaignId, ...input, portraitPath, idleVideoPath });
    await this.repository.save(npc);
    return npc;
  }

  async update(
    npc: Npc,
    input: UpdateNpcInput,
    portraitPath: string | null = npc.portraitPath,
    idleVideoPath: string | null = npc.idleVideoPath,
  ): Promise<Npc> {
    const updatedNpc = { ...updateNpc(npc, input), portraitPath, idleVideoPath };
    await this.repository.save(updatedNpc);
    return updatedNpc;
  }

  delete(npc: Npc): Promise<void> {
    return this.repository.delete(npc.campaignId, npc.id);
  }
}
