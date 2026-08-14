/**
 * But
 * Conserve les PNJ en mémoire hors de Tauri.
 *
 * Responsabilités
 * - sert au navigateur et aux tests ;
 * - respecte le contrat du repository de production ;
 */

import type { Npc } from '@app/features/npcs/domain/npc';
import { NpcRepository } from '@app/features/npcs/data-access/npc.repository';

export class InMemoryNpcRepository extends NpcRepository {
  private readonly npcs = new Map<string, Npc>();

  override listByCampaign(campaignId: string): Promise<readonly Npc[]> {
    return Promise.resolve(
      [...this.npcs.values()]
        .filter((npc) => npc.campaignId === campaignId)
        .sort(
          (left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id),
        ),
    );
  }

  override findById(campaignId: string, id: string): Promise<Npc | null> {
    const npc = this.npcs.get(id);
    return Promise.resolve(npc?.campaignId === campaignId ? npc : null);
  }

  override save(npc: Npc): Promise<void> {
    this.npcs.set(npc.id, npc);
    return Promise.resolve();
  }

  override delete(campaignId: string, id: string): Promise<void> {
    const npc = this.npcs.get(id);
    if (npc?.campaignId === campaignId) {
      this.npcs.delete(id);
    }
    return Promise.resolve();
  }
}
