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
  private readonly campaignIds = new Map<string, Set<string>>();
  private readonly overrides = new Map<string, Npc>();

  override listByCampaign(campaignId: string): Promise<readonly Npc[]> {
    return Promise.resolve(
      [...(this.campaignIds.get(campaignId) ?? new Set<string>())]
        .flatMap((id) => {
          const npc = this.npcs.get(id);
          return npc ? [this.effective(npc, campaignId)] : [];
        })
        .sort(
          (left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id),
        ),
    );
  }

  override listAvailableByCampaign(campaignId: string): Promise<readonly Npc[]> {
    const selected = this.campaignIds.get(campaignId) ?? new Set();
    return Promise.resolve(
      [...this.npcs.values()]
        .filter((npc) => npc.provenance === 'universe' && !selected.has(npc.id))
        .map((npc) => ({ ...npc, campaignId })),
    );
  }

  override findById(campaignId: string, id: string): Promise<Npc | null> {
    const npc = this.npcs.get(id);
    return Promise.resolve(
      npc && this.campaignIds.get(campaignId)?.has(id) ? this.effective(npc, campaignId) : null,
    );
  }

  override async save(npc: Npc): Promise<void> {
    if (npc.provenance === 'campaign') this.npcs.set(npc.id, npc);
    else this.overrides.set(this.key(npc.campaignId, npc.id), { ...npc, provenance: 'override' });
    const ids = this.campaignIds.get(npc.campaignId) ?? new Set<string>();
    ids.add(npc.id);
    this.campaignIds.set(npc.campaignId, ids);
  }

  override delete(campaignId: string, id: string): Promise<void> {
    const npc = this.npcs.get(id);
    if (npc?.provenance === 'campaign' && npc.campaignId === campaignId) {
      this.npcs.delete(id);
    }
    this.overrides.delete(this.key(campaignId, id));
    this.campaignIds.get(campaignId)?.delete(id);
    return Promise.resolve();
  }

  override attach(campaignId: string, id: string): Promise<void> {
    if (this.npcs.get(id)?.provenance !== 'universe') return Promise.reject(new Error('PNJ indisponible.'));
    const ids = this.campaignIds.get(campaignId) ?? new Set<string>();
    ids.add(id); this.campaignIds.set(campaignId, ids); return Promise.resolve();
  }

  override promote(campaignId: string, id: string): Promise<void> {
    const npc = this.npcs.get(id);
    if (!npc || npc.provenance !== 'campaign') return Promise.reject(new Error('PNJ indisponible.'));
    this.npcs.set(id, { ...npc, provenance: 'universe' }); return Promise.resolve();
  }

  override resetOverride(campaignId: string, id: string): Promise<void> {
    this.overrides.delete(this.key(campaignId, id)); return Promise.resolve();
  }

  private effective(npc: Npc, campaignId: string): Npc {
    return this.overrides.get(this.key(campaignId, npc.id)) ?? { ...npc, campaignId };
  }

  private key(campaignId: string, id: string): string { return `${campaignId}:${id}`; }
}
